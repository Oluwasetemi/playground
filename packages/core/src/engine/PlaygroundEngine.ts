import type {
  FileNode,
  PlaygroundEvents,
  PlaygroundOptions,
  PlaygroundSnapshot,
  PlaygroundStatus,
  Template,
} from './types'
import { EditorController } from '../editor/EditorController'
import { PersistenceManager } from '../persistence/PersistenceManager'
import { PreviewServer } from '../preview/PreviewServer'
import { playgroundActions } from '../state/actions'
import { TemplateCache } from '../template/TemplateCache'
import { TemplateManager } from '../template/TemplateManager'
import { TerminalController } from '../terminal/TerminalController'
import { FileSystemManager } from '../webcontainer/FileSystemManager'
import { WebContainerManager } from '../webcontainer/WebContainerManager'
import { EventEmitter } from './EventEmitter'

export class PlaygroundEngine {
  private static templateCache = new TemplateCache({ ttl: 10 * 60 * 1000, maxSize: 15 })

  private webcontainerManager: WebContainerManager
  private filesystemManager: FileSystemManager | null = null
  private editor: EditorController
  private preview: PreviewServer | null = null
  private terminal: TerminalController
  private persistence: PersistenceManager
  private templateManager: TemplateManager | null = null
  private events: EventEmitter<PlaygroundEvents>

  private currentTemplate: Template | null = null
  private status: PlaygroundStatus = 'initializing'
  private options: PlaygroundOptions
  private installedDependenciesHash: string | null = null

  constructor(options: PlaygroundOptions = {}) {
    this.options = options
    this.events = new EventEmitter<PlaygroundEvents>()
    this.webcontainerManager = new WebContainerManager(this.events, options.webcontainerAuth)
    this.editor = new EditorController(this.events)
    this.terminal = new TerminalController(this.events)
    this.persistence = new PersistenceManager('default')

    this.setupEventHandlers()
  }

  static async preboot(): Promise<void> {
    await WebContainerManager.preboot()
  }

  async initialize(template: Template): Promise<void> {
    try {
      this.setStatus('initializing')
      playgroundActions.setStatus('initializing')

      // Use cached template if available
      const cachedTemplate = PlaygroundEngine.templateCache.get(template.id)
      const resolvedTemplate = cachedTemplate || template

      // Cache for future use if not already cached
      if (!cachedTemplate) {
        PlaygroundEngine.templateCache.set(template.id, template)
      }

      playgroundActions.setTemplate(resolvedTemplate)

      // CRITICAL: Clean filesystem BEFORE mounting new template to prevent file conflicts
      if (this.filesystemManager && this.webcontainerManager.getInstance()) {
        console.warn('Cleaning existing filesystem before template mount...')
        await this.clearFileSystem()
      }

      this.currentTemplate = template
      this.persistence = new PersistenceManager(template.id)

      const webcontainer = await this.webcontainerManager.boot()
      playgroundActions.setBootStatus('booted')

      this.filesystemManager = new FileSystemManager(webcontainer, this.events)
      this.preview = new PreviewServer(webcontainer, this.events)
      this.templateManager = new TemplateManager(webcontainer)

      await this.filesystemManager.mount(template.files)
      this.templateManager.updateCurrentState(template)

      // Try to restore previous snapshot for THIS template (silent fail)
      await this.loadSnapshot().catch(() => false)

      this.setStatus('installing')
      playgroundActions.setStatus('installing')
      await this.installDependencies()

      // Start preview server
      if (!this.preview) {
        throw new Error('Preview server not initialized')
      }
      await this.preview.start(template.commands.dev)

      this.setStatus('ready')
      playgroundActions.setStatus('ready')

      // Note: Entry file will be opened when editor is mounted via mountEditor()
      // Don't try to open it here because editor may not be mounted yet

      // Enable auto-save after everything is initialized
      if (this.options.autoSave) {
        // Delay auto-save until editor and other components are mounted
        setTimeout(() => {
          // Only enable if filesystemManager and currentTemplate still exist
          if (this.filesystemManager && this.currentTemplate) {
            this.enableAutoSave()
          }
        }, 3000) // 3 seconds to ensure all components are mounted
      }
    }
    catch (error) {
      this.setStatus('error')
      playgroundActions.setStatus('error')
      playgroundActions.setError(error as Error)
      this.events.emit('error', error as Error)
      throw error
    }
  }

  /**
   * Switch to a new template with minimal disruption
   * Reuses WebContainer, only updates changed files
   */
  async switchTemplate(newTemplate: Template): Promise<void> {
    // If no current template, use full initialization
    if (!this.currentTemplate || !this.templateManager || !this.filesystemManager) {
      return this.initialize(newTemplate)
    }

    // Don't switch if already on this template
    if (this.currentTemplate.id === newTemplate.id) {
      console.warn('Already on template:', newTemplate.id)
      return
    }

    // eslint-disable-next-line no-console
    console.time('Template switch')

    try {
      this.setStatus('initializing')

      // Step 1: Save current state
      await this.saveSnapshot()

      // Step 2: Compute file diff
      const diff = await this.templateManager.computeDiff(newTemplate)
      console.warn('File diff:', {
        added: diff.added.length,
        modified: diff.modified.length,
        removed: diff.removed.length,
      })

      // Step 3: Apply incremental changes
      // eslint-disable-next-line no-console
      console.time('Apply file diff')
      await this.templateManager.applyDiff(diff, newTemplate)
      // eslint-disable-next-line no-console
      console.timeEnd('Apply file diff')

      // Invalidate file cache after filesystem changes
      this.filesystemManager.clearCache()

      // Step 4: Handle dependency changes
      const depsChanged = this.templateManager.dependenciesChanged(
        this.currentTemplate,
        newTemplate,
      )

      if (depsChanged) {
        console.warn('Dependencies changed, running npm install...')
        this.setStatus('installing')

        // Don't manually write package.json here - installDependencies will handle it
        // The template's package.json was already applied via applyDiff above

        await this.installDependencies()
      }
      else {
        console.warn('Dependencies unchanged, skipping npm install')
      }

      // Step 5: Always restart dev server when switching templates
      // Even if command is the same, files have changed
      console.warn('Restarting dev server for new template...')
      await this.webcontainerManager.killAll()
      if (this.preview) {
        await this.preview.start(newTemplate.commands.dev)
      }

      // Step 6: Update state
      const previousTemplate = this.currentTemplate
      this.currentTemplate = newTemplate
      this.persistence = new PersistenceManager(newTemplate.id)
      this.templateManager.updateCurrentState(newTemplate)

      // Step 7: Restore snapshot (don't auto-open files - editor may not be mounted)
      await this.loadSnapshot().catch(() => false)

      // Step 8: Update file tree
      const fileTree = await this.filesystemManager.getFileTree()
      this.events.emit('files:update', fileTree)

      this.setStatus('ready')

      // eslint-disable-next-line no-console
      console.timeEnd('Template switch')
      console.warn(`Switched from "${previousTemplate.id}" to "${newTemplate.id}"`)
    }
    catch (error) {
      console.error('Template switch failed:', error)
      this.setStatus('error')
      playgroundActions.setStatus('error')
      playgroundActions.setError(error as Error)
      this.events.emit('error', error as Error)
      throw error
    }
  }

  async updateFile(path: string, content: string): Promise<void> {
    if (!this.filesystemManager) {
      throw new Error('Filesystem not initialized')
    }

    await this.filesystemManager.writeFile(path, content)
  }

  async openFile(path: string): Promise<void> {
    if (!this.filesystemManager) {
      throw new Error('Filesystem not initialized')
    }

    const content = await this.filesystemManager.readFile(path)
    await this.editor.openFile(path, content)
  }

  async getFileTree(): Promise<FileNode[]> {
    if (!this.filesystemManager) {
      throw new Error('Filesystem not initialized')
    }

    return this.filesystemManager.getFileTree()
  }

  async mountEditor(container: HTMLElement): Promise<void> {
    this.editor.initialize(container, {
      theme: this.options.theme,
    })

    if (this.filesystemManager && this.currentTemplate) {
      try {
        const entryContent = await this.filesystemManager.readFile(this.currentTemplate.entryFile)
        await this.editor.openFile(this.currentTemplate.entryFile, entryContent)
      }
      catch (error) {
        console.error('Failed to open entry file:', error)
      }
    }
  }

  mountPreview(iframe: HTMLIFrameElement): void {
    if (!this.preview) {
      throw new Error('Preview not initialized')
    }

    this.preview.mountIframe(iframe)
  }

  mountTerminal(container: HTMLElement): void {
    this.terminal.mount(container)
  }

  async saveSnapshot(): Promise<void> {
    if (!this.filesystemManager || !this.currentTemplate) {
      return
    }

    const snapshot: PlaygroundSnapshot = {
      version: 1,
      timestamp: Date.now(),
      files: await this.filesystemManager.getAllFiles(),
      openTabs: this.editor.getOpenTabs(),
      activeFile: this.editor.getActiveFile(),
      templateId: this.currentTemplate.id,
    }

    await this.persistence.saveSnapshot(snapshot)
  }

  async loadSnapshot(): Promise<boolean> {
    const snapshot = await this.persistence.loadSnapshot()
    if (!snapshot || !this.filesystemManager) {
      return false
    }

    // Verify snapshot matches current template
    if (snapshot.templateId !== this.currentTemplate?.id) {
      console.warn('Snapshot template mismatch, ignoring')
      return false
    }

    // Restore files and editor state
    for (const [path, content] of Object.entries(snapshot.files)) {
      await this.filesystemManager.writeFile(path, content)
    }

    for (const tab of snapshot.openTabs) {
      const content = snapshot.files[tab] || ''
      await this.editor.openFile(tab, content)
    }

    if (snapshot.activeFile) {
      const content = snapshot.files[snapshot.activeFile] || ''
      await this.editor.openFile(snapshot.activeFile, content)
    }

    return true
  }

  on<K extends keyof PlaygroundEvents>(event: K, handler: PlaygroundEvents[K]): () => void {
    return this.events.on(event, handler)
  }

  getStatus(): PlaygroundStatus {
    return this.status
  }

  /**
   * Get the static template cache instance
   */
  static getTemplateCache(): TemplateCache {
    return PlaygroundEngine.templateCache
  }

  /**
   * Preload templates into cache for faster switching
   */
  static async preloadTemplates(
    templates: Template[],
  ): Promise<void> {
    for (const template of templates) {
      PlaygroundEngine.templateCache.set(template.id, template)
    }
    console.warn(`Preloaded ${templates.length} templates into cache`)
  }

  async cleanup(): Promise<void> {
    console.warn('Cleaning up playground engine...')

    this.persistence.disableAutoSave()
    this.editor.destroy()
    this.terminal.destroy()
    await this.webcontainerManager.killAll()

    if (this.filesystemManager) {
      await this.clearFileSystem()
    }

    this.events.removeAllListeners()

    this.filesystemManager = null
    this.preview = null
    this.currentTemplate = null
    this.templateManager = null
    this.installedDependenciesHash = null

    // Reset stores
    playgroundActions.reset()

    console.warn('Cleanup complete')
  }

  private async clearFileSystem(): Promise<void> {
    try {
      const instance = this.webcontainerManager.getInstance()
      if (!instance)
        return

      const files = await instance.fs.readdir('/', { withFileTypes: true })

      for (const file of files) {
        if (file.name === 'node_modules')
          continue

        try {
          await instance.fs.rm(file.name, { recursive: true, force: true })
        }
        catch (error) {
          console.warn(`Failed to remove ${file.name}:`, error)
        }
      }

      // Reset dependency cache since we might have cleared package.json
      this.installedDependenciesHash = null
    }
    catch (error) {
      console.warn('Failed to clear filesystem:', error)
    }
  }

  private async installDependencies(): Promise<void> {
    if (!this.currentTemplate || Object.keys(this.currentTemplate.dependencies).length === 0) {
      console.warn('No dependencies to install')
      return
    }

    // Compute hash of current template dependencies
    const depsHash = JSON.stringify(this.currentTemplate.dependencies)
    const devDepsHash = JSON.stringify(this.currentTemplate.devDependencies)

    // Check if dependencies match what's already installed
    if (this.installedDependenciesHash === depsHash) {
      console.warn('Dependencies unchanged from previous install, skipping npm install')
      return
    }

    try {
      const webcontainer = this.webcontainerManager.getInstance()
      if (!webcontainer) {
        throw new Error('WebContainer not initialized')
      }

      // CRITICAL: Read existing package.json from mounted template files
      let templatePackageJson: any = {}
      try {
        const content = await webcontainer.fs.readFile('/package.json', 'utf-8')
        templatePackageJson = JSON.parse(content)
        console.warn('Found package.json from template:', templatePackageJson)
      }
      catch {
        console.warn('No package.json in template, will create minimal one')
      }

      // Merge template's package.json with additional dependencies
      const packageJson = {
        name: templatePackageJson.name || this.currentTemplate.id,
        version: templatePackageJson.version || '1.0.0',
        type: templatePackageJson.type || 'module',
        scripts: templatePackageJson.scripts || {},
        dependencies: {
          ...(templatePackageJson.dependencies || {}),
          ...this.currentTemplate.dependencies,
        },
        devDependencies: templatePackageJson.devDependencies || {},
      }

      // Only rewrite if we actually modified it or if scripts exist
      if (Object.keys(packageJson.scripts).length > 0 || Object.keys(this.currentTemplate.dependencies).length > 0) {
        await webcontainer.fs.writeFile('/package.json', JSON.stringify(packageJson, null, 2))
        console.warn('Updated package.json with merged dependencies:', packageJson)
      }

      // Check if node_modules exists and package.json matches
      try {
        await webcontainer.fs.readdir('/node_modules')

        const existingDepsHash = JSON.stringify(packageJson.dependencies || {})
        const existingDevDepsHash = JSON.stringify(packageJson.devDependencies || {})

        if (existingDepsHash === depsHash && existingDevDepsHash === devDepsHash) {
          console.warn('node_modules exists with correct dependencies, skipping npm install')
          this.installedDependenciesHash = depsHash
          return
        }
        else {
          console.warn('Dependencies changed, will reinstall')
        }
      }
      catch {
        // node_modules doesn't exist, proceed with install
        console.warn('node_modules not found or invalid, will install')
      }

      console.warn('Installing dependencies...', this.currentTemplate.dependencies)
      // eslint-disable-next-line no-console
      console.time('npm install')

      // Use direct spawn without output piping for better error visibility
      const installProcess = await webcontainer.spawn('npm', ['install'])

      // Capture output for error reporting
      let output = ''
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            output += data
            // Log in real-time for debugging
            if (data.trim()) {
              console.warn('[npm]', data.trim())
            }
          },
        }),
      )

      const exitCode = await installProcess.exit

      // eslint-disable-next-line no-console
      console.timeEnd('npm install')

      if (exitCode !== 0) {
        console.error('npm install failed. Output:', output)
        const errorMsg = output.includes('EACCES')
          ? 'Permission denied. This may be a WebContainer limitation.'
          : output.includes('ERESOLVE')
            ? 'Dependency resolution failed. Check package versions.'
            : output.includes('404')
              ? 'Package not found. Check package names and versions.'
              : output || 'No error details available'

        throw new Error(
          `npm install failed with exit code ${exitCode}.\n${errorMsg}`,
        )
      }

      // Cache successful installation
      this.installedDependenciesHash = depsHash
      console.warn('Dependencies installed successfully')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.events.emit('error', new Error(`Failed to install dependencies: ${message}`))
      throw error
    }
  }

  private setupEventHandlers(): void {
    this.events.on('file:change', async (path, content) => {
      if (path && path === this.editor.getActiveFile() && !path.endsWith('/')) {
        try {
          await this.updateFile(path, content)
        }
        catch (error) {
          console.error('Failed to update file:', error)
        }
      }
    })
  }

  private setStatus(status: PlaygroundStatus): void {
    this.status = status
    this.events.emit('status:change', status)
  }

  private enableAutoSave(): void {
    this.persistence.enableAutoSave(
      async () => {
        if (!this.filesystemManager || !this.currentTemplate) {
          throw new Error('Cannot auto-save: playground not fully initialized')
        }

        return {
          version: 1,
          timestamp: Date.now(),
          files: await this.filesystemManager.getAllFiles(),
          openTabs: this.editor.getOpenTabs(),
          activeFile: this.editor.getActiveFile(),
          templateId: this.currentTemplate.id,
        }
      },
      this.options.autoSaveInterval,
    )
  }
}

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
  private autoSaveSetupTimer: ReturnType<typeof setTimeout> | null = null
  private editorContainer: HTMLElement | null = null

  constructor(options: PlaygroundOptions = {}) {
    this.options = options
    this.events = new EventEmitter<PlaygroundEvents>()
    this.webcontainerManager = new WebContainerManager(this.events, options.webcontainerAuth)
    // Create editor with specified type (defaults to codemirror)
    this.editor = new EditorController(this.events, options.editor || 'codemirror')
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
        this.autoSaveSetupTimer = setTimeout(() => {
          this.autoSaveSetupTimer = null
          if (this.filesystemManager && this.currentTemplate) {
            this.enableAutoSave()
          }
        }, 3000)
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

      // Step 1: Stop dev server BEFORE making filesystem changes so Vite isn't
      // watching files while we overwrite them (prevents spurious config restarts).
      console.warn('Stopping current dev server...')
      await this.preview?.stop()

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

      // Step 4.5: Switch currentTemplate NOW so installDependencies hashes the
      // new template's deps, not the old one (which would always match and skip).
      const previousTemplate = this.currentTemplate
      this.currentTemplate = newTemplate
      this.persistence = new PersistenceManager(newTemplate.id)
      this.templateManager.updateCurrentState(newTemplate)
      this.persistence.clearSnapshot()

      if (depsChanged) {
        console.warn('Dependencies changed, running npm install...')
        this.setStatus('installing')
        await this.installDependencies()
      }
      else {
        console.warn('Dependencies unchanged, skipping npm install')
      }

      // Step 5: Start dev server for new template
      console.warn('Starting dev server for new template...')
      if (this.preview) {
        await this.preview.start(newTemplate.commands.dev)
      }

      // Step 6: Emit file tree (applyDiff already cleaned up old files — no extra validation needed)
      const fileTree = await this.filesystemManager.getFileTree()
      this.events.emit('files:update', fileTree)
      playgroundActions.setFiles(fileTree)

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

    // Use silent: true to prevent circular file:change events
    await this.filesystemManager.writeFile(path, content, { silent: true })
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
    this.editorContainer = container
    await this.editor.initialize(container, {
      theme: this.options.theme,
      lineNumbers: this.options.showLineNumbers,
      ...this.options.editorOptions,
    })

    if (this.filesystemManager && this.currentTemplate) {
      const entryFile = this.currentTemplate.entryFile
      try {
        const entryContent = await this.filesystemManager.readFile(entryFile)
        await this.editor.openFile(entryFile, entryContent)
      }
      catch (error) {
        console.error(`Failed to open entry file ${entryFile}:`, error)
      }
    }
  }

  async switchEditorType(type: 'codemirror' | 'monaco'): Promise<void> {
    if (!this.editorContainer) return

    const activeFile = this.editor.getActiveFile()
    const content = this.editor.getContent()
    const openTabs = this.editor.getOpenTabs()

    this.editor.destroy()
    this.editor = new EditorController(this.events, type)

    await this.editor.initialize(this.editorContainer, {
      theme: this.options.theme,
      lineNumbers: this.options.showLineNumbers,
      ...this.options.editorOptions,
    })

    // Restore previously open tabs, active file last so it ends up focused
    const tabsToRestore = openTabs.filter(t => t !== activeFile)
    for (const tab of tabsToRestore) {
      try {
        const tabContent = this.filesystemManager
          ? await this.filesystemManager.readFile(tab)
          : ''
        await this.editor.openFile(tab, tabContent)
      }
      catch { /* skip missing tabs */ }
    }

    if (activeFile) {
      await this.editor.openFile(activeFile, content)
    }
  }

  mountPreview(iframe: HTMLIFrameElement): void {
    if (!this.preview) {
      console.warn('Preview not initialized yet, skipping mount')
      return
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

    // Only restore files that belong to the current template's expected paths
    // to prevent stale data from a prior template version leaking in
    const expectedPaths = this.templateManager
      ? this.templateManager.getExpectedPaths(this.currentTemplate!)
      : null

    for (const [path, content] of Object.entries(snapshot.files)) {
      if (expectedPaths && !expectedPaths.has(path)) {
        console.warn(`Snapshot contains unexpected path, skipping: ${path}`)
        continue
      }
      // silent: true prevents triggering spurious file:change events during restore
      await this.filesystemManager.writeFile(path, content, { silent: true })
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
   * Toggle line numbers in the editor
   */
  setLineNumbers(show: boolean): void {
    this.editor.setLineNumbers(show)
  }

  /**
   * Format the current file using Prettier
   * @see https://prettier.io/docs/en/browser
   */
  async formatCode(): Promise<void> {
    if (!this.filesystemManager || !this.currentTemplate) {
      return
    }

    const activeFile = this.editor.getActiveFile()
    if (!activeFile) {
      return
    }

    const content = this.editor.getContent()
    const ext = activeFile.split('.').pop()?.toLowerCase()

    type ParserEntry = { parser: string, plugins: any[] }

    const extToParser: Record<string, string> = {
      js: 'babel', jsx: 'babel', mjs: 'babel', cjs: 'babel',
      ts: 'typescript', tsx: 'typescript',
      html: 'html', htm: 'html', vue: 'vue',
      css: 'css', scss: 'scss', less: 'less',
    }

    const parser = ext ? extToParser[ext] : undefined
    if (!parser) {
      console.warn(`File type .${ext} is not supported for formatting`)
      return
    }

    try {
      const [prettier, babelPlugin, estreePlugin, htmlPlugin, postcssPlugin, tsPlugin] =
        await Promise.all([
          import('prettier'),
          import('prettier/plugins/babel'),
          import('prettier/plugins/estree'),
          import('prettier/plugins/html'),
          import('prettier/plugins/postcss'),
          import('prettier/plugins/typescript'),
        ])

      const parserMap: Record<string, ParserEntry> = {
        babel:      { parser: 'babel',      plugins: [babelPlugin.default, estreePlugin.default] },
        typescript: { parser: 'typescript', plugins: [tsPlugin.default, estreePlugin.default] },
        html:       { parser: 'html',       plugins: [htmlPlugin.default] },
        vue:        { parser: 'vue',        plugins: [htmlPlugin.default] },
        css:        { parser: 'css',        plugins: [postcssPlugin.default] },
        scss:       { parser: 'scss',       plugins: [postcssPlugin.default] },
        less:       { parser: 'less',       plugins: [postcssPlugin.default] },
      }

      const entry = parserMap[parser]

      const formattedCode = await prettier.default.format(content, {
        parser: entry.parser,
        plugins: entry.plugins,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 80,
      })

      this.editor.setContent(formattedCode)
      await this.updateFile(activeFile, formattedCode)
    }
    catch (error) {
      console.error('Failed to format code with Prettier:', error)
      this.events.emit('error', new Error(`Format failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  /**
   * Reset to original template code
   */
  async resetToTemplate(template: Template): Promise<void> {
    if (!this.filesystemManager) {
      return
    }

    try {
      // Remount original template files
      await this.filesystemManager.mount(template.files)

      // Refresh file tree
      const fileTree = await this.filesystemManager.getFileTree()
      this.events.emit('files:update', fileTree)
      playgroundActions.setFiles(fileTree)

      // Reopen entry file
      if (template.entryFile) {
        const content = await this.filesystemManager.readFile(template.entryFile)
        await this.editor.openFile(template.entryFile, content)
      }

      // Clear persistence for this template (start fresh)
      this.persistence.clearSnapshot()
    }
    catch (error) {
      console.error('Failed to reset to template:', error)
      this.events.emit('error', error as Error)
    }
  }

  /**
   * Open playground in StackBlitz using the official SDK
   * Uses current filesystem state (including user edits), not the original template
   * @see https://developer.stackblitz.com/platform/api/javascript-sdk
   */
  async openInStackBlitz(template: Template): Promise<void> {
    if (!this.filesystemManager) {
      return
    }

    // Get current files from the filesystem (includes user edits)
    const currentFiles = await this.filesystemManager.getAllFiles()

    // Remove leading slashes from file paths for StackBlitz compatibility
    const files: Record<string, string> = {}
    for (const [path, content] of Object.entries(currentFiles)) {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path
      files[cleanPath] = content
    }

    // Determine the StackBlitz template type based on the project type
    const getStackBlitzTemplate = (): 'node' | 'javascript' | 'typescript' => {
      // Use 'node' template for projects that need npm/WebContainers
      // This includes React, Vue, Node.js, etc.
      if (template.id.includes('react') || template.id.includes('vue') || template.id.includes('node')) {
        return 'node'
      }
      // For vanilla JS projects without build tools
      if (template.id.includes('vanilla')) {
        return 'javascript'
      }
      // Default to node for full npm support
      return 'node'
    }

    // Get the entry file path without leading slash
    const entryFile = template.entryFile?.startsWith('/')
      ? template.entryFile.slice(1)
      : template.entryFile || 'index.js'

    const { default: sdk } = await import('@stackblitz/sdk')

    // Open project in StackBlitz using the SDK
    sdk.openProject(
      {
        title: template.name || template.id,
        description: template.description || `${template.name} playground`,
        template: getStackBlitzTemplate(),
        files,
      },
      {
        newWindow: true,
        openFile: entryFile,
      },
    )
  }

  /**
   * Get current editor content
   */
  getEditorContent(): string {
    return this.editor.getContent()
  }

  /**
   * Set editor content
   */
  setEditorContent(content: string): void {
    this.editor.setContent(content)
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

    if (this.autoSaveSetupTimer !== null) {
      clearTimeout(this.autoSaveSetupTimer)
      this.autoSaveSetupTimer = null
    }

    this.persistence.disableAutoSave()
    this.editor.destroy()
    this.terminal.destroy()
    await this.webcontainerManager.teardown()

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
    if (!this.currentTemplate || (Object.keys(this.currentTemplate.dependencies).length === 0 && Object.keys(this.currentTemplate.devDependencies).length === 0)) {
      console.warn('No dependencies to install')
      return
    }

    // Compute hash of current template dependencies (BOTH deps and devDeps)
    // Sort keys to ensure insertion-order differences don't cause false cache misses
    const sortedStringify = (obj: Record<string, string>) =>
      JSON.stringify(obj, Object.keys(obj).sort())
    const combinedHash = sortedStringify(this.currentTemplate.dependencies)
      + sortedStringify(this.currentTemplate.devDependencies)

    // Check if dependencies match what's already installed
    if (this.installedDependenciesHash === combinedHash) {
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
        devDependencies: {
          ...(templatePackageJson.devDependencies || {}),
          ...this.currentTemplate.devDependencies,
        },
      }

      // Always write package.json before npm install
      await webcontainer.fs.writeFile('/package.json', JSON.stringify(packageJson, null, 2))
      console.warn('Updated package.json with merged dependencies:', packageJson)

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
      this.installedDependenciesHash = combinedHash
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

  /**
   * Flatten file tree to array of paths
   * Used for validation after template switching
   */
  }

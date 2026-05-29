import type { EventEmitter } from '../engine/EventEmitter'
import type { PlaygroundEvents } from '../engine/types'
import type { EditorAdapter, EditorOptions } from './EditorAdapter'

// Monaco types - we use dynamic import to avoid bundling Monaco unless needed
type Monaco = typeof import('monaco-editor')
type IStandaloneCodeEditor = import('monaco-editor').editor.IStandaloneCodeEditor
type ITextModel = import('monaco-editor').editor.ITextModel

/**
 * Monaco Editor implementation
 * Provides a powerful, VS Code-like editing experience
 */
export class MonacoEditor implements EditorAdapter {
  private monaco: Monaco | null = null
  private editor: IStandaloneCodeEditor | null = null
  private events: EventEmitter<PlaygroundEvents>
  private activeFile: string = ''
  private openTabs: Set<string> = new Set()
  private models: Map<string, ITextModel> = new Map()
  private theme: 'light' | 'dark' = 'dark'
  private showLineNumbers: boolean = true
  private updateTimeout: number | null = null
  private resizeObserver: ResizeObserver | null = null

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events
  }

  async initialize(container: HTMLElement, options: EditorOptions = {}): Promise<void> {
    this.theme = options.theme || 'dark'
    this.showLineNumbers = options.lineNumbers !== false

    // Configure Monaco environment BEFORE importing
    this.configureMonacoEnvironment()

    // Dynamically import Monaco to enable code splitting
    const monaco = await this.loadMonaco()
    this.monaco = monaco

    // Initialize StandaloneServices (must be done before creating editor)
    await this.initializeServices(monaco)

    // Configure TypeScript/JavaScript defaults
    this.configureLanguageDefaults(monaco)

    // Create the editor instance
    this.editor = monaco.editor.create(container, {
      value: '',
      language: 'typescript',
      theme: this.theme === 'dark' ? 'vs-dark' : 'vs',
      automaticLayout: true,
      minimap: {
        enabled: options.minimap !== false,
      },
      lineNumbers: this.showLineNumbers ? 'on' : 'off',
      fontSize: options.fontSize || 14,
      fontFamily: options.fontFamily || '\'JetBrains Mono\', \'Fira Code\', Menlo, Monaco, \'Courier New\', monospace',
      tabSize: options.tabSize || 2,
      wordWrap: options.wordWrap || 'on',
      readOnly: options.readOnly || false,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      bracketPairColorization: {
        enabled: true,
      },
      padding: {
        top: 10,
        bottom: 10,
      },
      lineNumbersMinChars: 3,
      lineDecorationsWidth: 0,
      overviewRulerBorder: false,
      overviewRulerLanes: 0,
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
      },
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      formatOnPaste: true,
      formatOnType: true,
      fixedOverflowWidgets: true,
    })

    // Listen for content changes
    this.editor.onDidChangeModelContent(() => {
      this.handleContentChange()
    })

    // Handle resize
    this.resizeObserver = new ResizeObserver(() => {
      this.editor?.layout()
    })
    this.resizeObserver.observe(container)

    // Force initial layout after a frame to ensure container has dimensions
    requestAnimationFrame(() => {
      this.editor?.layout()
      monaco.editor.remeasureFonts()
    })

    // Additional layout and font remeasure after styles are fully loaded
    setTimeout(() => {
      this.editor?.layout()
      monaco.editor.remeasureFonts()
    }, 100)

    setTimeout(() => {
      this.editor?.layout()
      monaco.editor.remeasureFonts()
    }, 1000)
  }

  /**
   * Dynamically load Monaco editor
   * This enables code splitting - Monaco is only loaded when needed
   */
  private async loadMonaco(): Promise<Monaco> {
    // Dynamic import for code splitting
    const monaco = await import('monaco-editor')
    return monaco
  }

  /**
   * Initialize Monaco StandaloneServices
   * This must be done before creating any editor instances
   */
  private async initializeServices(_monaco: Monaco): Promise<void> {
    try {
      // Import StandaloneServices for proper initialization
      // @ts-ignore - Monaco internal API, no type declarations
      const { StandaloneServices } = await import('monaco-editor/esm/vs/editor/standalone/browser/standaloneServices')
      // Services are automatically initialized on first editor creation when StandaloneServices is present
      void StandaloneServices
    }
    catch {
      // StandaloneServices may not be available in all Monaco builds
      // This is fine - editor will still work
    }
  }

  /**
   * Configure Monaco web workers
   * This sets up the worker environment for Monaco editor features like IntelliSense.
   */
  private configureMonacoEnvironment(): void {
    // Skip if already configured
    if (globalThis.MonacoEnvironment?.getWorker) {
      return
    }

    // Configure Monaco to use workers
    // We'll try Vite worker imports first, fallback to CDN
    globalThis.MonacoEnvironment = {
      getWorker: async (_workerId: string, label: string) => {
        // Try to use Vite worker imports (recommended for Vite-based hosts).
        // The ?worker suffix is Vite-only; other bundlers fall through to the CDN fallback.
        try {
          if (label === 'json') {
            // @ts-ignore - ?worker is a Vite-specific import suffix, no type decls available
            const w = await import('monaco-editor/esm/vs/language/json/json.worker?worker')
            // eslint-disable-next-line new-cap
            return new w.default()
          }
          if (label === 'css' || label === 'scss' || label === 'less') {
            // @ts-ignore
            const w = await import('monaco-editor/esm/vs/language/css/css.worker?worker')
            // eslint-disable-next-line new-cap
            return new w.default()
          }
          if (label === 'html' || label === 'handlebars' || label === 'razor') {
            // @ts-ignore
            const w = await import('monaco-editor/esm/vs/language/html/html.worker?worker')
            // eslint-disable-next-line new-cap
            return new w.default()
          }
          if (label === 'typescript' || label === 'javascript') {
            // @ts-ignore
            const w = await import('monaco-editor/esm/vs/language/typescript/ts.worker?worker')
            // eslint-disable-next-line new-cap
            return new w.default()
          }
          // @ts-ignore
          const w = await import('monaco-editor/esm/vs/editor/editor.worker?worker')
          // eslint-disable-next-line new-cap
          return new w.default()
        }
        catch {
          // Fallback to CDN workers if Vite imports fail
          return this.createCdnWorker(label)
        }
      },
    }
  }

  /**
   * Create a worker using CDN as fallback
   */
  private createCdnWorker(label: string): Worker {
    const cdnBase = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs'

    let workerUrl: string

    switch (label) {
      case 'json':
        workerUrl = `${cdnBase}/language/json/json.worker.js`
        break
      case 'css':
      case 'scss':
      case 'less':
        workerUrl = `${cdnBase}/language/css/css.worker.js`
        break
      case 'html':
      case 'handlebars':
      case 'razor':
        workerUrl = `${cdnBase}/language/html/html.worker.js`
        break
      case 'typescript':
      case 'javascript':
        workerUrl = `${cdnBase}/language/typescript/ts.worker.js`
        break
      default:
        workerUrl = `${cdnBase}/editor/editor.worker.js`
    }

    // Create a blob worker that imports from CDN
    const blob = new Blob([`importScripts('${workerUrl}');`], { type: 'application/javascript' })
    return new Worker(URL.createObjectURL(blob))
  }

  /**
   * Configure TypeScript/JavaScript language defaults
   */
  private configureLanguageDefaults(monaco: Monaco): void {
    // TypeScript compiler options
    const tsDefaults = monaco.languages.typescript.typescriptDefaults
    tsDefaults.setCompilerOptions({
      ...tsDefaults.getCompilerOptions(),
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      reactNamespace: 'React',
      allowSyntheticDefaultImports: true,
      skipLibCheck: true,
      isolatedModules: true,
    })

    // JavaScript compiler options
    const jsDefaults = monaco.languages.typescript.javascriptDefaults
    jsDefaults.setCompilerOptions({
      ...jsDefaults.getCompilerOptions(),
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    })

    // Enable validation
    tsDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    jsDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })
  }

  async openFile(path: string, content: string): Promise<void> {
    if (!this.editor || !this.monaco) {
      throw new Error('Editor not initialized')
    }

    this.activeFile = path
    this.openTabs.add(path)

    // Get or create model for this file
    let model = this.models.get(path)
    const language = this.getLanguageFromPath(path)
    const uri = this.monaco.Uri.parse(`file://${path}`)

    if (!model) {
      // Check if model already exists (might have been created elsewhere)
      model = this.monaco.editor.getModel(uri) ?? undefined

      if (!model) {
        model = this.monaco.editor.createModel(content, language, uri)
        this.models.set(path, model)
      }
      else {
        // Update existing model content
        model.setValue(content)
      }
    }
    else {
      // Update content if model exists
      model.setValue(content)
    }

    // Set the model on the editor
    this.editor.setModel(model)

    // Remeasure fonts when switching files (helps with rendering)
    this.monaco.editor.remeasureFonts()
  }

  getContent(): string {
    return this.editor?.getValue() || ''
  }

  setContent(content: string): void {
    if (!this.editor)
      return

    const model = this.editor.getModel()
    if (model) {
      // Use pushEditOperations to preserve undo stack
      model.pushEditOperations(
        [],
        [{
          range: model.getFullModelRange(),
          text: content,
        }],
        () => null,
      )
    }
  }

  getActiveFile(): string {
    return this.activeFile
  }

  getOpenTabs(): string[] {
    return Array.from(this.openTabs)
  }

  closeTab(path: string): void {
    this.openTabs.delete(path)

    // Dispose the model
    const model = this.models.get(path)
    if (model) {
      model.dispose()
      this.models.delete(path)
    }
  }

  setLineNumbers(show: boolean): void {
    this.showLineNumbers = show
    this.editor?.updateOptions({
      lineNumbers: show ? 'on' : 'off',
    })
  }

  getLineNumbers(): boolean {
    return this.showLineNumbers
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme
    this.monaco?.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs')
  }

  focus(): void {
    this.editor?.focus()
  }

  destroy(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    // Dispose all models
    for (const model of this.models.values()) {
      model.dispose()
    }
    this.models.clear()

    // Dispose editor
    if (this.editor) {
      this.editor.dispose()
      this.editor = null
    }

    this.openTabs.clear()
  }

  /**
   * Add type definitions for external libraries
   * Useful for providing IntelliSense for npm packages
   */
  addTypeDefinitions(path: string, content: string): void {
    if (!this.monaco)
      return

    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
      content,
      `file://${path}`,
    )
  }

  /**
   * Get Monaco editor instance for advanced customization
   */
  getEditorInstance(): IStandaloneCodeEditor | null {
    return this.editor
  }

  /**
   * Get Monaco instance for advanced customization
   */
  getMonacoInstance(): Monaco | null {
    return this.monaco
  }

  private handleContentChange(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    this.updateTimeout = window.setTimeout(() => {
      const content = this.getContent()
      this.events.emit('file:change', this.activeFile, content)
    }, 300)
  }

  /**
   * Get Monaco language ID from file path
   */
  private getLanguageFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()

    const languageMap: Record<string, string> = {
      js: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      mts: 'typescript',
      cts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      md: 'markdown',
      markdown: 'markdown',
      vue: 'html', // Basic Vue support
      svelte: 'html', // Basic Svelte support
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
    }

    return languageMap[ext || ''] || 'plaintext'
  }
}

// Monaco environment is set on self (globalThis) for web worker configuration
// The type is already declared by monaco-editor

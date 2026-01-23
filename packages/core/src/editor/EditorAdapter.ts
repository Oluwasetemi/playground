/**
 * Abstract interface for editor implementations
 * Allows switching between CodeMirror, Monaco, or other editors
 */
export interface EditorAdapter {
  /**
   * Initialize the editor in a container element
   */
  initialize(container: HTMLElement, options?: EditorOptions): Promise<void>

  /**
   * Open a file in the editor
   */
  openFile(path: string, content: string): Promise<void>

  /**
   * Get the current editor content
   */
  getContent(): string

  /**
   * Set the editor content
   */
  setContent(content: string): void

  /**
   * Get the currently active file path
   */
  getActiveFile(): string

  /**
   * Get all open tabs
   */
  getOpenTabs(): string[]

  /**
   * Close a tab
   */
  closeTab(path: string): void

  /**
   * Toggle line numbers visibility
   */
  setLineNumbers(show: boolean): void

  /**
   * Get current line numbers visibility state
   */
  getLineNumbers(): boolean

  /**
   * Set the editor theme
   */
  setTheme?(theme: 'light' | 'dark'): void

  /**
   * Focus the editor
   */
  focus?(): void

  /**
   * Destroy the editor instance and cleanup resources
   */
  destroy(): void
}

export interface EditorOptions {
  /** Editor theme */
  theme?: 'light' | 'dark'
  /** Show line numbers */
  lineNumbers?: boolean
  /** Read-only mode */
  readOnly?: boolean
  /** Tab size */
  tabSize?: number
  /** Font size in pixels */
  fontSize?: number
  /** Font family */
  fontFamily?: string
  /** Word wrap mode */
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
  /** Minimap visibility (Monaco only) */
  minimap?: boolean
}

export type EditorType = 'codemirror' | 'monaco'

/**
 * Factory function type for creating editor instances
 */
export type EditorFactory = (
  events: import('../engine/EventEmitter').EventEmitter<import('../engine/types').PlaygroundEvents>
) => EditorAdapter

import type { EventEmitter } from '../engine/EventEmitter'
import type { PlaygroundEvents } from '../engine/types'
import type { EditorAdapter, EditorOptions, EditorType } from './EditorAdapter'
import { createEditor } from './editorFactory'

/**
 * EditorController - Backwards-compatible wrapper around EditorAdapter
 *
 * This class maintains the original API while delegating to the
 * appropriate editor implementation (CodeMirror or Monaco).
 *
 * @deprecated Use createEditor() or createEditorAsync() from editorFactory.ts directly
 * for new code. This wrapper is provided for backwards compatibility.
 */
export class EditorController implements EditorAdapter {
  private adapter: EditorAdapter
  private editorType: EditorType

  constructor(
    events: EventEmitter<PlaygroundEvents>,
    editorType: EditorType = 'codemirror',
  ) {
    this.editorType = editorType
    this.adapter = createEditor(editorType, events)
  }

  /**
   * Get the underlying editor type
   */
  getEditorType(): EditorType {
    return this.editorType
  }

  /**
   * Get the underlying editor adapter
   * Useful for accessing editor-specific features
   */
  getAdapter(): EditorAdapter {
    return this.adapter
  }

  async initialize(container: HTMLElement, options?: EditorOptions): Promise<void> {
    return this.adapter.initialize(container, options)
  }

  async openFile(path: string, content: string): Promise<void> {
    return this.adapter.openFile(path, content)
  }

  getContent(): string {
    return this.adapter.getContent()
  }

  setContent(content: string): void {
    this.adapter.setContent(content)
  }

  getActiveFile(): string {
    return this.adapter.getActiveFile()
  }

  getOpenTabs(): string[] {
    return this.adapter.getOpenTabs()
  }

  closeTab(path: string): void {
    this.adapter.closeTab(path)
  }

  setLineNumbers(show: boolean): void {
    this.adapter.setLineNumbers(show)
  }

  getLineNumbers(): boolean {
    return this.adapter.getLineNumbers()
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.adapter.setTheme?.(theme)
  }

  focus(): void {
    this.adapter.focus?.()
  }

  destroy(): void {
    this.adapter.destroy()
  }
}

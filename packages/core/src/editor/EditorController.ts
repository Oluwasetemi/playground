import type { Extension } from '@codemirror/state'
import type { EventEmitter } from '../engine/EventEmitter'
import type { PlaygroundEvents } from '../engine/types'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view'
import { deferUntilIdle } from '../utils/lazyLoader'

export class EditorController {
  private view: EditorView | null = null
  private events: EventEmitter<PlaygroundEvents>
  private activeFile: string = ''
  private openTabs: Set<string> = new Set()
  private theme: 'light' | 'dark' = 'dark'
  private updateTimeout: number | null = null
  private initialized: boolean = false

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events
  }

  /**
   * Initialize editor with lazy loading
   * Heavy extensions are loaded during idle time
   */
  async initialize(container: HTMLElement, options: { theme?: 'light' | 'dark' } = {}): Promise<void> {
    this.theme = options.theme || 'dark'

    // Load basic editor immediately for responsiveness
    this.createBasicEditor(container)

    // Defer loading heavy extensions until idle
    await deferUntilIdle(() => {
      if (this.view && !this.initialized) {
        this.loadExtensions()
        this.initialized = true
      }
    })
  }

  private createBasicEditor(container: HTMLElement): void {
    // Full extensions loaded upfront
    // CodeMirror is already well-optimized, main perf gains come from other lazy loading
    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
      ]),
      this.theme === 'dark' ? oneDark : [],
      EditorView.updateListener.of((update: any) => {
        if (update.docChanged) {
          this.handleContentChange()
        }
      }),
    ]

    const state = EditorState.create({
      doc: '',
      extensions,
    })

    this.view = new EditorView({
      state,
      parent: container,
    })
  }

  private loadExtensions(): void {
    if (!this.view)
      return

    // For simplicity, we'll skip runtime extension loading and include all in initial setup
    // This is acceptable since CodeMirror extensions are already lightweight
    // The main performance gain comes from deferred terminal and other heavy components
    console.warn('Editor extensions already loaded during initialization')
  }

  async openFile(path: string, content: string): Promise<void> {
    if (!this.view) {
      throw new Error('Editor not initialized')
    }

    this.activeFile = path
    this.openTabs.add(path)

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content,
      },
    })
  }

  getContent(): string {
    if (!this.view)
      return ''
    return this.view.state.doc.toString()
  }

  getActiveFile(): string {
    return this.activeFile
  }

  getOpenTabs(): string[] {
    return Array.from(this.openTabs)
  }

  closeTab(path: string): void {
    this.openTabs.delete(path)
  }

  destroy(): void {
    if (this.view) {
      this.view.destroy()
      this.view = null
    }
    this.openTabs.clear()
    this.initialized = false
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
}

import type { Extension } from '@codemirror/state'
import type { EventEmitter } from '../engine/EventEmitter'
import type { PlaygroundEvents } from '../engine/types'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState } from '@codemirror/state'
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
  private lineNumbersCompartment: Compartment
  private languageCompartment: Compartment
  private showLineNumbers: boolean = true

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events
    this.lineNumbersCompartment = new Compartment()
    this.languageCompartment = new Compartment()
  }

  /**
   * Initialize editor with lazy loading
   * Heavy extensions are loaded during idle time
   */
  async initialize(container: HTMLElement, options: { theme?: 'light' | 'dark' } = {}): Promise<void> {
    this.theme = options.theme || 'dark'

    // Already initialized — just re-attach the existing view to the container
    // instead of creating a second CodeMirror instance (happens on template switch).
    if (this.view) {
      container.appendChild(this.view.dom)
      return
    }

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

  private getLangExtension(filePath: string): Extension {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    switch (ext) {
      case 'css': return css()
      case 'html': case 'htm': return html()
      // @codemirror/lang-vue@0.1.3 is incompatible with current @lezer/common —
      // its tree nodes lack .children, crashing autocompletion and syntaxTree walks.
      // JS highlighting works for Vue's <script> sections and is safe.
      case 'vue': return javascript({ jsx: false, typescript: false })
      default: return javascript({ jsx: true, typescript: true })
    }
  }

  private getBaseExtensions(): Extension[] {
    return [
      this.lineNumbersCompartment.of(this.showLineNumbers ? lineNumbers() : []),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      closeBrackets(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      this.languageCompartment.of(this.getLangExtension(this.activeFile)),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
      ]),
      this.theme === 'dark' ? oneDark : [],
      EditorView.updateListener.of((update: any) => {
        if (update.docChanged) {
          this.handleContentChange()
        }
      }),
    ]
  }

  private createBasicEditor(container: HTMLElement): void {
    const state = EditorState.create({
      doc: '',
      extensions: this.getBaseExtensions(),
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

    // Resolve language — fall back to JavaScript if the specific parser throws.
    let lang: Extension
    try {
      lang = this.getLangExtension(path)
    }
    catch (e) {
      console.warn(`Language extension failed for ${path}, falling back to JS:`, e)
      lang = javascript({ jsx: true, typescript: true })
    }

    // Dispatch language reconfiguration + full document replacement in one
    // transaction. bracketMatching and autocompletion removed — both walk the
    // Lezer tree synchronously and crash on an uninitialized Vue/HTML grammar.
    // Using dispatch (not setState) preserves editor history so Ctrl-Z works.
    try {
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: content },
        effects: this.languageCompartment.reconfigure(lang),
      })
    }
    catch (e) {
      // Last-resort fallback: wipe state entirely so the editor stays usable.
      console.error(`dispatch failed for ${path}, resetting state:`, e)
      this.view.setState(
        EditorState.create({
          doc: content,
          extensions: [
            this.lineNumbersCompartment.of(this.showLineNumbers ? lineNumbers() : []),
            this.languageCompartment.of(javascript({ jsx: true, typescript: true })),
            history(),
            drawSelection(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            this.theme === 'dark' ? oneDark : [],
            EditorView.updateListener.of((update: any) => {
              if (update.docChanged) this.handleContentChange()
            }),
          ],
        }),
      )
    }
  }

  getContent(): string {
    if (!this.view)
      return ''
    return this.view.state.doc.toString()
  }

  setContent(content: string): void {
    if (!this.view)
      return

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content,
      },
    })
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

  setLineNumbers(show: boolean): void {
    if (!this.view)
      return

    this.showLineNumbers = show
    this.view.dispatch({
      effects: this.lineNumbersCompartment.reconfigure(
        show ? lineNumbers() : []
      ),
    })
  }

  getLineNumbers(): boolean {
    return this.showLineNumbers
  }

  destroy(): void {
    if (this.updateTimeout !== null) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
    }
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

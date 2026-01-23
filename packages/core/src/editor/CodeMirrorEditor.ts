import type { Extension } from '@codemirror/state'
import type { EventEmitter } from '../engine/EventEmitter'
import type { PlaygroundEvents } from '../engine/types'
import type { EditorAdapter, EditorOptions } from './EditorAdapter'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view'

/**
 * CodeMirror-based editor implementation
 */
export class CodeMirrorEditor implements EditorAdapter {
  private view: EditorView | null = null
  private events: EventEmitter<PlaygroundEvents>
  private activeFile: string = ''
  private openTabs: Set<string> = new Set()
  private theme: 'light' | 'dark' = 'dark'
  private updateTimeout: number | null = null
  private lineNumbersCompartment: Compartment
  private themeCompartment: Compartment
  private languageCompartment: Compartment
  private showLineNumbers: boolean = true

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events
    this.lineNumbersCompartment = new Compartment()
    this.themeCompartment = new Compartment()
    this.languageCompartment = new Compartment()
  }

  async initialize(container: HTMLElement, options: EditorOptions = {}): Promise<void> {
    this.theme = options.theme || 'dark'
    this.showLineNumbers = options.lineNumbers !== false

    const extensions: Extension[] = [
      this.lineNumbersCompartment.of(this.showLineNumbers ? lineNumbers() : []),
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
      this.languageCompartment.of(javascript({ jsx: true, typescript: true })),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
      ]),
      this.themeCompartment.of(this.theme === 'dark' ? oneDark : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.handleContentChange()
        }
      }),
    ]

    // Apply font settings if provided
    if (options.fontSize || options.fontFamily) {
      const themeSpec: Record<string, Record<string, string>> = {}
      if (options.fontSize) {
        themeSpec['&'] = { fontSize: `${options.fontSize}px` }
      }
      if (options.fontFamily) {
        themeSpec['.cm-content'] = { fontFamily: options.fontFamily }
      }
      extensions.push(EditorView.theme(themeSpec))
    }

    // Apply read-only mode if specified
    if (options.readOnly) {
      extensions.push(EditorState.readOnly.of(true))
    }

    const state = EditorState.create({
      doc: '',
      extensions,
    })

    this.view = new EditorView({
      state,
      parent: container,
    })
  }

  async openFile(path: string, content: string): Promise<void> {
    if (!this.view) {
      throw new Error('Editor not initialized')
    }

    this.activeFile = path
    this.openTabs.add(path)

    // Update language based on file extension
    const languageExtension = this.getLanguageExtension(path)
    this.view.dispatch({
      effects: this.languageCompartment.reconfigure(languageExtension),
    })

    // Update content
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
        show ? lineNumbers() : [],
      ),
    })
  }

  getLineNumbers(): boolean {
    return this.showLineNumbers
  }

  setTheme(theme: 'light' | 'dark'): void {
    if (!this.view)
      return

    this.theme = theme
    this.view.dispatch({
      effects: this.themeCompartment.reconfigure(
        theme === 'dark' ? oneDark : [],
      ),
    })
  }

  focus(): void {
    this.view?.focus()
  }

  destroy(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }
    if (this.view) {
      this.view.destroy()
      this.view = null
    }
    this.openTabs.clear()
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
   * Get the appropriate language extension based on file extension
   */
  private getLanguageExtension(path: string): Extension {
    const ext = path.split('.').pop()?.toLowerCase()

    switch (ext) {
      case 'js':
      case 'mjs':
      case 'cjs':
        return javascript()
      case 'jsx':
        return javascript({ jsx: true })
      case 'ts':
      case 'mts':
      case 'cts':
        return javascript({ typescript: true })
      case 'tsx':
        return javascript({ jsx: true, typescript: true })
      case 'json':
        return json()
      case 'html':
      case 'htm':
        return html()
      case 'css':
        return css()
      case 'md':
      case 'markdown':
        return markdown()
      default:
        // Default to JSX/TSX for unknown files
        return javascript({ jsx: true, typescript: true })
    }
  }
}

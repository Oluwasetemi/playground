import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { EventEmitter } from '../engine/EventEmitter';
import type { PlaygroundEvents } from '../engine/types';

export class EditorController {
  private view: EditorView | null = null;
  private events: EventEmitter<PlaygroundEvents>;
  private activeFile: string = '';
  private openTabs: Set<string> = new Set();
  private theme: 'light' | 'dark' = 'dark';
  private updateTimeout: number | null = null;

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events;
  }

  initialize(container: HTMLElement, options: { theme?: 'light' | 'dark' } = {}): void {
    this.theme = options.theme || 'dark';

    const basicExtensions = [
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
    ];

    const extensions: Extension[] = [
      ...basicExtensions,
      this.theme === 'dark' ? oneDark : [],
      EditorView.updateListener.of((update: any) => {
        if (update.docChanged) {
          this.handleContentChange();
        }
      }),
    ];

    const state = EditorState.create({
      doc: '',
      extensions,
    });

    this.view = new EditorView({
      state,
      parent: container,
    });
  }

  async openFile(path: string, content: string): Promise<void> {
    if (!this.view) {
      throw new Error('Editor not initialized');
    }

    this.activeFile = path;
    this.openTabs.add(path);

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content,
      },
    });
  }

  getContent(): string {
    if (!this.view) return '';
    return this.view.state.doc.toString();
  }

  getActiveFile(): string {
    return this.activeFile;
  }

  getOpenTabs(): string[] {
    return Array.from(this.openTabs);
  }

  closeTab(path: string): void {
    this.openTabs.delete(path);
  }

  destroy(): void {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    this.openTabs.clear();
  }

  private handleContentChange(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = window.setTimeout(() => {
      const content = this.getContent();
      this.events.emit('file:change', this.activeFile, content);
    }, 300);
  }

}

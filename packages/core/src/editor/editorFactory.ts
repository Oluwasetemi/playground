import type { EventEmitter } from '../engine/EventEmitter'
import type { PlaygroundEvents } from '../engine/types'
import type { EditorAdapter, EditorType } from './EditorAdapter'
import { CodeMirrorEditor } from './CodeMirrorEditor'

/**
 * Create an editor instance based on the specified type
 *
 * @param type - The type of editor to create ('codemirror' or 'monaco')
 * @param events - Event emitter for playground events
 * @returns An editor adapter instance
 *
 * @example
 * ```ts
 * // Create a CodeMirror editor (default, synchronous)
 * const editor = createEditor('codemirror', events)
 *
 * // Create a Monaco editor (lazy loaded)
 * const editor = await createEditorAsync('monaco', events)
 * ```
 */
export function createEditor(
  type: EditorType,
  events: EventEmitter<PlaygroundEvents>,
): EditorAdapter {
  switch (type) {
    case 'codemirror':
      return new CodeMirrorEditor(events)
    case 'monaco':
      // Monaco is lazy-loaded, return a proxy that loads on first use
      return createMonacoProxy(events)
    default:
      throw new Error(`Unknown editor type: ${type}`)
  }
}

/**
 * Async version that directly creates the editor
 * Use this when you want to ensure the editor is fully loaded
 */
export async function createEditorAsync(
  type: EditorType,
  events: EventEmitter<PlaygroundEvents>,
): Promise<EditorAdapter> {
  switch (type) {
    case 'codemirror':
      return new CodeMirrorEditor(events)
    case 'monaco': {
      // Dynamic import for code splitting
      const { MonacoEditor } = await import('./MonacoEditor')
      return new MonacoEditor(events)
    }
    default:
      throw new Error(`Unknown editor type: ${type}`)
  }
}

/**
 * Create a proxy that lazy-loads Monaco on first use
 * This allows the engine to be created synchronously while
 * Monaco is loaded in the background
 */
function createMonacoProxy(
  events: EventEmitter<PlaygroundEvents>,
): EditorAdapter {
  let monacoEditor: EditorAdapter | null = null
  let loadingPromise: Promise<EditorAdapter> | null = null

  const ensureLoaded = async (): Promise<EditorAdapter> => {
    if (monacoEditor)
      return monacoEditor

    if (!loadingPromise) {
      loadingPromise = import('./MonacoEditor').then(({ MonacoEditor }) => {
        monacoEditor = new MonacoEditor(events)
        return monacoEditor
      })
    }

    return loadingPromise
  }

  // Return a proxy that loads Monaco on first method call
  return {
    async initialize(container, options) {
      const editor = await ensureLoaded()
      return editor.initialize(container, options)
    },
    async openFile(path, content) {
      const editor = await ensureLoaded()
      return editor.openFile(path, content)
    },
    getContent() {
      return monacoEditor?.getContent() || ''
    },
    setContent(content) {
      monacoEditor?.setContent(content)
    },
    getActiveFile() {
      return monacoEditor?.getActiveFile() || ''
    },
    getOpenTabs() {
      return monacoEditor?.getOpenTabs() || []
    },
    closeTab(path) {
      monacoEditor?.closeTab(path)
    },
    setLineNumbers(show) {
      monacoEditor?.setLineNumbers(show)
    },
    getLineNumbers() {
      return monacoEditor?.getLineNumbers() || true
    },
    setTheme(theme) {
      monacoEditor?.setTheme?.(theme)
    },
    focus() {
      monacoEditor?.focus?.()
    },
    destroy() {
      monacoEditor?.destroy()
      monacoEditor = null
      loadingPromise = null
    },
  }
}

/**
 * Check if Monaco editor is available
 * Monaco requires certain browser features and may not work in all environments
 */
export function isMonacoAvailable(): boolean {
  // Check for required browser features
  if (typeof window === 'undefined')
    return false
  if (typeof Worker === 'undefined')
    return false

  // Monaco should work in modern browsers
  return true
}

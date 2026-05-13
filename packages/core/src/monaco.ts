/**
 * Monaco Editor entry point
 *
 * This separate entry point allows tree-shaking when Monaco is not used.
 * Import from '@setemiojo/playground-core/monaco' instead of the main entry.
 *
 * @example
 * ```ts
 * import { MonacoEditor } from '@setemiojo/playground-core/monaco'
 *
 * const editor = new MonacoEditor(events)
 * await editor.initialize(container)
 * ```
 */

export { MonacoEditor } from './editor/MonacoEditor'

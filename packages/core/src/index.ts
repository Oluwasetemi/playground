export { EventEmitter } from './engine/EventEmitter'
export { PlaygroundEngine } from './engine/PlaygroundEngine'
export type {
  ConsoleMessage,
  FileNode,
  PlaygroundEvents,
  PlaygroundOptions,
  PlaygroundSnapshot,
  PlaygroundStatus,
  ProcessOutput,
  Template,
} from './engine/types'

export * from './state/actions'

// State management (Nanostores)
export * from './state/stores'
export { TemplateManager } from './template/TemplateManager'

export type { FileDiff } from './template/TemplateManager'
export type { WebContainerAuthConfig } from './webcontainer/WebContainerManager'

// Editor exports
export { EditorController } from './editor/EditorController'
export { CodeMirrorEditor } from './editor/CodeMirrorEditor'
export { createEditor, createEditorAsync, isMonacoAvailable } from './editor/editorFactory'
export type { EditorAdapter, EditorOptions, EditorType, EditorFactory } from './editor/EditorAdapter'

// Monaco is exported separately to allow dynamic imports
// Use: const { MonacoEditor } = await import('@setemiojo/playground-core/monaco')
// Or use createEditorAsync('monaco', events) for automatic lazy loading

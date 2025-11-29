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

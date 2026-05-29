import type { FileNode, PlaygroundEngine, PlaygroundStatus, Template } from '@setemiojo/playground-core'
import type { ComputedRef, DeepReadonly, Ref, ShallowRef } from 'vue'
import { inject, provide } from 'vue'

export interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info'
  text: string
  timestamp: number
}

export interface TerminalMessage {
  type: 'stdout' | 'stderr'
  text: string
  timestamp: number
}

// Stable: actions whose identity never changes after initialization
export interface PlaygroundStableValue {
  updateFile: (path: string, content: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  saveSnapshot: () => Promise<void>
  toggleLineNumbers: () => void
  formatCode: () => Promise<void>
  resetCode: () => Promise<void>
  openInStackBlitz: () => Promise<void>
  clearConsole: () => void
  clearTerminal: () => void
  hiddenFiles: ComputedRef<string[]>
}

// Volatile: reactive state that components watch
export interface PlaygroundVolatileValue {
  engine: ShallowRef<PlaygroundEngine | null>
  status: DeepReadonly<ShallowRef<PlaygroundStatus>> | Ref<PlaygroundStatus>
  files: DeepReadonly<ShallowRef<readonly FileNode[]>> | Ref<FileNode[]>
  previewUrl: DeepReadonly<ShallowRef<string | null>> | Ref<string | null>
  showLineNumbers: Ref<boolean>
  consoleMessages: Ref<ConsoleMessage[]>
  terminalMessages: Ref<TerminalMessage[]>
  template: Ref<Template | null>
}

export type PlaygroundContextValue = PlaygroundStableValue & PlaygroundVolatileValue

const PLAYGROUND_STABLE_KEY = Symbol('playground-stable')
const PLAYGROUND_VOLATILE_KEY = Symbol('playground-volatile')

export function providePlaygroundStable(value: PlaygroundStableValue) {
  provide(PLAYGROUND_STABLE_KEY, value)
}

export function providePlaygroundVolatile(value: PlaygroundVolatileValue) {
  provide(PLAYGROUND_VOLATILE_KEY, value)
}

export function usePlaygroundContext(): PlaygroundContextValue {
  const stable = inject<PlaygroundStableValue>(PLAYGROUND_STABLE_KEY)
  const volatile = inject<PlaygroundVolatileValue>(PLAYGROUND_VOLATILE_KEY)

  if (!stable || !volatile) {
    throw new Error('usePlaygroundContext() must be used inside a <Playground> component')
  }

  return { ...stable, ...volatile }
}

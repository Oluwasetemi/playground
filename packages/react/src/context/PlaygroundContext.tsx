import type { FileNode, PlaygroundEngine, PlaygroundStatus, Template } from '@setemiojo/playground-core'
import { createContext, useContext } from 'react'

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

// Stable: callbacks and engine reference — only changes when engine is swapped
export interface PlaygroundStableValue {
  engine: PlaygroundEngine | null
  updateFile: (path: string, content: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  saveSnapshot: () => Promise<void>
  toggleLineNumbers: () => void
  formatCode: () => Promise<void>
  resetCode: () => Promise<void>
  openInStackBlitz: () => Promise<void>
  clearConsole: () => void
  clearTerminal: () => void
  hiddenFiles: string[]
}

// Volatile: state that changes frequently (status updates, messages, file changes)
export interface PlaygroundVolatileValue {
  status: PlaygroundStatus
  files: FileNode[]
  previewUrl: string | null
  showLineNumbers: boolean
  consoleMessages: ConsoleMessage[]
  terminalMessages: TerminalMessage[]
  template: Template | null
}

// Combined type for backward-compat consumers of usePlaygroundContext()
export type PlaygroundContextValue = PlaygroundStableValue & PlaygroundVolatileValue

export const PlaygroundStableContext = createContext<PlaygroundStableValue | null>(null)
export const PlaygroundVolatileContext = createContext<PlaygroundVolatileValue | null>(null)

// Keep the old name as an alias so existing imports don't break
export const PlaygroundContext = PlaygroundStableContext

export function usePlaygroundContext(): PlaygroundContextValue {
  const stable = useContext(PlaygroundStableContext)
  const volatile = useContext(PlaygroundVolatileContext)
  if (!stable || !volatile) {
    throw new Error('usePlaygroundContext must be used within a Playground component')
  }
  return { ...stable, ...volatile }
}

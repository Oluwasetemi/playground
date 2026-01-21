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

export interface PlaygroundContextValue {
  engine: PlaygroundEngine | null
  status: PlaygroundStatus
  files: FileNode[]
  previewUrl: string | null
  updateFile: (path: string, content: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  saveSnapshot: () => Promise<void>
  // New methods for enhanced toolbar
  toggleLineNumbers: () => void
  showLineNumbers: boolean
  formatCode: () => Promise<void>
  resetCode: () => Promise<void>
  openInStackBlitz: () => Promise<void>
  consoleMessages: ConsoleMessage[]
  clearConsole: () => void
  terminalMessages: TerminalMessage[]
  clearTerminal: () => void
  template: Template | null
}

export const PlaygroundContext = createContext<PlaygroundContextValue | null>(null)

export function usePlaygroundContext(): PlaygroundContextValue {
  const context = useContext(PlaygroundContext)
  if (!context) {
    throw new Error('usePlaygroundContext must be used within a Playground component')
  }
  return context
}

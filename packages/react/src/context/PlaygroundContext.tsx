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

// Stable: pure callbacks — identity is stable across renders (useMemo'd in usePlayground)
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
  hiddenFiles: string[]
}

// Volatile: state that changes frequently — rebuilt every render, never memoized.
// engine lives here (not stable) because refs don't trigger re-renders; reading
// engineRef.current must happen at render time to pick up the initialized engine.
export interface PlaygroundVolatileValue {
  engine: PlaygroundEngine | null
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

// @deprecated — use PlaygroundStableContext or PlaygroundVolatileContext directly.
// This alias only covers the stable half; volatile state (engine, status, files…)
// is missing. Kept for build-compat until the next major version.
export const PlaygroundContext = PlaygroundStableContext

export function usePlaygroundContext(): PlaygroundContextValue {
  const stable = useContext(PlaygroundStableContext)
  const volatile = useContext(PlaygroundVolatileContext)
  if (!stable || !volatile) {
    throw new Error('usePlaygroundContext must be used within a Playground component')
  }
  return { ...stable, ...volatile }
}

import type { FileNode, PlaygroundEngine, PlaygroundStatus } from '@playground/core'
import { createContext, useContext } from 'react'

export interface PlaygroundContextValue {
  engine: PlaygroundEngine | null
  status: PlaygroundStatus
  files: FileNode[]
  previewUrl: string | null
  updateFile: (path: string, content: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  saveSnapshot: () => Promise<void>
}

export const PlaygroundContext = createContext<PlaygroundContextValue | null>(null)

export function usePlaygroundContext(): PlaygroundContextValue {
  const context = useContext(PlaygroundContext)
  if (!context) {
    throw new Error('usePlaygroundContext must be used within a Playground component')
  }
  return context
}

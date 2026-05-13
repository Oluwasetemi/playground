import type { PlaygroundOptions, Template } from '@setemiojo/playground-core'
import type { ReactNode } from 'react'
import { PlaygroundStableContext, PlaygroundVolatileContext } from './context/PlaygroundContext'
import { usePlayground } from './usePlayground'

export interface PlaygroundProps {
  template: Template
  options?: PlaygroundOptions
  children: ReactNode
}

export function Playground({ template, options, children }: PlaygroundProps) {
  const { stableValue, volatileValue } = usePlayground(template, options)

  return (
    <PlaygroundStableContext.Provider value={stableValue}>
      <PlaygroundVolatileContext.Provider value={volatileValue}>
        {children}
      </PlaygroundVolatileContext.Provider>
    </PlaygroundStableContext.Provider>
  )
}

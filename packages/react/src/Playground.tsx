import type { PlaygroundOptions, Template } from '@setemiojo/playground-core'
import type { ReactNode } from 'react'
import { PlaygroundContext } from './context/PlaygroundContext'
import { usePlayground } from './usePlayground'

export interface PlaygroundProps {
  template: Template
  options?: PlaygroundOptions
  children: ReactNode
}

export function Playground({ template, options, children }: PlaygroundProps) {
  const playground = usePlayground(template, options)

  return (
    <PlaygroundContext.Provider value={playground}>
      {children}
    </PlaygroundContext.Provider>
  )
}

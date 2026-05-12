import { useEffect, useRef } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

export function PlaygroundTerminal() {
  const { engine, status } = usePlaygroundContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedEngineRef = useRef<typeof engine>(null)

  useEffect(() => {
    if (
      containerRef.current
      && engine
      && status === 'ready'
      && mountedEngineRef.current !== engine
    ) {
      mountedEngineRef.current = engine
      engine.mountTerminal(containerRef.current)
    }

    return () => {
      // When engine reference changes, reset so the new engine gets a fresh mount
      if (mountedEngineRef.current !== engine) {
        mountedEngineRef.current = null
      }
    }
  }, [engine, status])

  return (
    <div className="playground-terminal">
      <div className="terminal-header">Console</div>
      <div ref={containerRef} className="terminal-content" />
    </div>
  )
}

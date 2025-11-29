import { useEffect, useRef } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

export function PlaygroundTerminal() {
  const { engine, status } = usePlaygroundContext()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && engine && status === 'ready') {
      engine.mountTerminal(containerRef.current)
    }
  }, [engine, status])

  return (
    <div className="playground-terminal">
      <div className="terminal-header">Console</div>
      <div ref={containerRef} className="terminal-content" />
    </div>
  )
}

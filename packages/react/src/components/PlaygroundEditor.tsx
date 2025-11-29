import { useEffect, useRef } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

export function PlaygroundEditor() {
  const { engine, status } = usePlaygroundContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = false
  }, [engine])

  useEffect(() => {
    if (containerRef.current && engine && status === 'ready' && !mountedRef.current) {
      mountedRef.current = true
      engine.mountEditor(containerRef.current).catch((error) => {
        console.error('Failed to mount editor:', error)
        mountedRef.current = false
      })
    }
  }, [engine, status])

  return (
    <div className="playground-editor">
      {status === 'initializing' && <div className="loading">Initializing...</div>}
      {status === 'installing' && <div className="loading">Installing dependencies...</div>}
      <div ref={containerRef} className="editor-container" />
    </div>
  )
}

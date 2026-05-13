import { useEffect, useRef } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

function SwitchingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7M15 11V7" />
    </svg>
  )
}

export function PlaygroundEditor() {
  const { engine, status, template } = usePlaygroundContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)
  const prevStatusRef = useRef(status)

  // Reset mountedRef whenever status leaves 'ready' (template switch or re-init)
  // so that when status returns to 'ready', mountEditor runs again with the new files.
  useEffect(() => {
    if (prevStatusRef.current === 'ready' && status !== 'ready') {
      mountedRef.current = false
    }
    prevStatusRef.current = status
  }, [status])

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

  const isSwitching = status === 'initializing' || status === 'installing'

  const switchingLabel = status === 'installing'
    ? `Installing ${template?.name ?? ''} dependencies…`
    : `Switching to ${template?.name ?? ''}…`

  return (
    <div className="playground-editor">
      <div ref={containerRef} className="editor-container" />
      {isSwitching && (
        <div className="editor-switching-overlay" aria-live="polite" aria-label={switchingLabel}>
          <div className="editor-switching-card">
            <span className="editor-switching-icon"><SwitchingIcon /></span>
            <span className="editor-switching-label">{switchingLabel}</span>
            <span className="editor-switching-dots">
              <span /><span /><span />
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

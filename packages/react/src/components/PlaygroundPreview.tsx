import { useEffect, useRef } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

export function PlaygroundPreview() {
  const { engine, previewUrl, status } = usePlaygroundContext()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastUrlRef = useRef<string | null>(null)
  const lastEngineRef = useRef<typeof engine>(null)

  useEffect(() => {
    // Only mount when:
    // 1. iframe exists
    // 2. engine exists and is different from last engine (template switch)
    // 3. previewUrl exists and is different from last URL
    const shouldMount = iframeRef.current
      && engine
      && previewUrl
      && (previewUrl !== lastUrlRef.current || engine !== lastEngineRef.current)

    if (shouldMount && iframeRef.current) {
      engine.mountPreview(iframeRef.current)
      lastUrlRef.current = previewUrl
      lastEngineRef.current = engine
    }
  }, [engine, previewUrl])

  return (
    <div className="playground-preview">
      {status !== 'ready' && (
        <div className="loading">
          {status === 'initializing' && 'Initializing...'}
          {status === 'installing' && 'Installing dependencies...'}
          {status === 'error' && 'Error loading preview'}
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Preview"
        style={{ display: previewUrl ? 'block' : 'none' }}
      />
    </div>
  )
}

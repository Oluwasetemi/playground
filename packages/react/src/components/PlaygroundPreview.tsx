import { useEffect, useRef } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

export function PlaygroundPreview() {
  const { engine, previewUrl, status } = usePlaygroundContext()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current && engine && previewUrl) {
      engine.mountPreview(iframeRef.current)
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
      {previewUrl && <iframe ref={iframeRef} title="Preview" />}
    </div>
  )
}

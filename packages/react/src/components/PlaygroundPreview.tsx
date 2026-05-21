import { useEffect, useRef, useState } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

export interface PlaygroundPreviewProps {
  title?: string
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export function PlaygroundPreview({ title = 'Preview' }: PlaygroundPreviewProps) {
  const { engine, previewUrl, status } = usePlaygroundContext()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastUrlRef = useRef<string | null>(null)
  const lastEngineRef = useRef<typeof engine>(null)
  const [inputUrl, setInputUrl] = useState('')
  const [iframeLoading, setIframeLoading] = useState(false)

  // Keep input in sync when the server URL changes (new template boot or switch)
  useEffect(() => {
    if (previewUrl) {
      setInputUrl(previewUrl)
      setIframeLoading(true)
    }
  }, [previewUrl])

  useEffect(() => {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!iframeRef.current || !inputUrl) return
    setIframeLoading(true)
    iframeRef.current.src = inputUrl
  }

  function handleRefresh() {
    if (!iframeRef.current) return
    setIframeLoading(true)
    // Reassigning src triggers a reload without needing contentWindow access
    // (which is blocked cross-origin for WebContainer preview URLs)
    iframeRef.current.src = iframeRef.current.src
  }

  const isReady = status === 'ready' && !!previewUrl

  return (
    <div className="playground-preview">
      <div className="preview-toolbar">
        <span className="preview-title">{title}</span>

        <form className="preview-url-form" onSubmit={handleSubmit}>
          <div className="preview-url-bar">
            {iframeLoading && isReady
              ? <span className="preview-spinner" aria-hidden="true" />
              : <span className="preview-dot" aria-hidden="true" data-ready={isReady} />}
            <input
              type="text"
              className="preview-url-input"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              disabled={!isReady}
              spellCheck={false}
              aria-label="Preview URL"
              placeholder="Waiting for server…"
            />
          </div>
        </form>

        <button
          type="button"
          className="preview-icon-btn"
          onClick={handleRefresh}
          disabled={!isReady}
          title="Refresh preview"
          aria-label="Refresh preview"
        >
          <RefreshIcon />
        </button>

        <button
          type="button"
          className="preview-icon-btn"
          onClick={() => window.open(inputUrl || previewUrl || '', '_blank')}
          disabled={!isReady}
          title="Open in new tab"
          aria-label="Open in new tab"
        >
          <ExternalLinkIcon />
        </button>
      </div>

      <div className="preview-frame-area">
        {status !== 'ready' && (
          <div className="loading">
            {status === 'initializing' && 'Initializing…'}
            {status === 'installing' && 'Installing dependencies…'}
            {status === 'error' && 'Error loading preview'}
          </div>
        )}
        <iframe
          ref={iframeRef}
          title={title}
          onLoad={() => setIframeLoading(false)}
          style={{ display: previewUrl ? 'block' : 'none' }}
        />
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'

export type PanelTab = 'result' | 'console' | 'terminal'

export interface PlaygroundPanelProps {
  defaultTab?: PanelTab
}

export function PlaygroundPanel({ defaultTab = 'result' }: PlaygroundPanelProps) {
  const { engine, previewUrl, status, consoleMessages, terminalMessages } = usePlaygroundContext()
  const [activeTab, setActiveTab] = useState<PanelTab>(defaultTab)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastUrlRef = useRef<string | null>(null)
  const lastEngineRef = useRef<typeof engine>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const shouldMount =
      iframeRef.current &&
      engine &&
      previewUrl &&
      (previewUrl !== lastUrlRef.current || engine !== lastEngineRef.current)

    if (shouldMount && iframeRef.current) {
      engine.mountPreview(iframeRef.current)
      lastUrlRef.current = previewUrl
      lastEngineRef.current = engine
    }
  }, [engine, previewUrl])

  // Auto-scroll console to bottom
  useEffect(() => {
    if (consoleRef.current && activeTab === 'console') {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [consoleMessages, activeTab])

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current && activeTab === 'terminal') {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalMessages, activeTab])

  return (
    <div className="playground-panel">
      <div className="playground-panel-header">
        <div className="playground-panel-tabs">
          <button
            className={`playground-panel-tab ${activeTab === 'result' ? 'active' : ''}`}
            onClick={() => setActiveTab('result')}
          >
            Result
          </button>
          <button
            className={`playground-panel-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            Console
            {consoleMessages.length > 0 && (
              <span className="console-badge">{consoleMessages.length}</span>
            )}
          </button>
          <button
            className={`playground-panel-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            Terminal
          </button>
        </div>
        <div className="playground-panel-actions">
          {activeTab === 'result' && previewUrl && (
            <button
              className="playground-panel-action-btn"
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.src = previewUrl
                }
              }}
              title="Refresh preview"
              aria-label="Refresh preview"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="playground-panel-content">
        <div
          className={`playground-panel-result ${activeTab === 'result' ? 'active' : ''}`}
        >
          {status !== 'ready' && (
            <div className="playground-panel-loading">
              {status === 'initializing' && 'Initializing...'}
              {status === 'installing' && 'Installing dependencies...'}
              {status === 'error' && 'Error loading preview'}
            </div>
          )}
          <iframe
            ref={iframeRef}
            title="Preview"
            className="playground-panel-iframe"
            style={{ display: previewUrl ? 'block' : 'none' }}
          />
        </div>
        <div
          className={`playground-panel-console ${activeTab === 'console' ? 'active' : ''}`}
          ref={consoleRef}
        >
          {consoleMessages.length === 0 ? (
            <div className="playground-console-empty">No console output</div>
          ) : (
            consoleMessages.map((msg, index) => (
              <div key={index} className={`playground-console-message ${msg.type}`}>
                {msg.type === 'error' && <span className="console-icon">x</span>}
                {msg.type === 'warn' && <span className="console-icon">!</span>}
                {msg.type === 'info' && <span className="console-icon">i</span>}
                <span className="console-text">{msg.text}</span>
              </div>
            ))
          )}
        </div>
        <div
          className={`playground-panel-terminal ${activeTab === 'terminal' ? 'active' : ''}`}
          ref={terminalRef}
        >
          {terminalMessages.length === 0 ? (
            <div className="playground-terminal-empty">No terminal output</div>
          ) : (
            terminalMessages.map((msg, index) => (
              <div key={index} className={`playground-terminal-line ${msg.type}`}>
                <span className="terminal-text">{msg.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

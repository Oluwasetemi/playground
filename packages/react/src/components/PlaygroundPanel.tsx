import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlaygroundContext } from '../context/PlaygroundContext'
import { Terminal } from './Terminal'

export type PanelTab = 'result' | 'console' | 'terminal'
export type ConsoleFilter = 'all' | 'log' | 'warn' | 'error' | 'info'

export interface PlaygroundPanelProps {
  defaultTab?: PanelTab
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

const ErrorIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <circle cx="6" cy="6" r="5.5" fill="#f44336" />
    <path d="M4 4l4 4M8 4l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const WarnIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M6 1L11.2 10H.8L6 1z" fill="#f9a825" />
    <path d="M6 4.5v2.5M6 8.5v.5" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

const InfoIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <circle cx="6" cy="6" r="5.5" fill="#1976d2" />
    <path d="M6 5v4M6 3.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const LogIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 4h8M2 6h6M2 8h7" stroke="#9e9e9e" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

export function PlaygroundPanel({ defaultTab = 'result' }: PlaygroundPanelProps) {
  const { engine, previewUrl, status, consoleMessages, clearConsole, terminalMessages } = usePlaygroundContext()
  const [activeTab, setActiveTab] = useState<PanelTab>(defaultTab)
  const [filter, setFilter] = useState<ConsoleFilter>('all')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastUrlRef = useRef<string | null>(null)
  const lastEngineRef = useRef<typeof engine>(null)
  const consoleRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (consoleRef.current && activeTab === 'console') {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [consoleMessages, activeTab])

  const errorCount = useMemo(
    () => consoleMessages.filter(m => m.type === 'error').length,
    [consoleMessages],
  )
  const warnCount = useMemo(
    () => consoleMessages.filter(m => m.type === 'warn').length,
    [consoleMessages],
  )
  const filtered = useMemo(
    () => filter === 'all' ? consoleMessages : consoleMessages.filter(m => m.type === filter),
    [consoleMessages, filter],
  )

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
              <span className={`console-badge ${errorCount > 0 ? 'error' : warnCount > 0 ? 'warn' : 'log'}`}>
                {consoleMessages.length}
              </span>
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
              onClick={() => { if (iframeRef.current) iframeRef.current.src = previewUrl }}
              title="Refresh preview"
              aria-label="Refresh preview"
            >
              <RefreshIcon />
            </button>
          )}
        </div>
      </div>

      <div className="playground-panel-content">
        <div className={`playground-panel-result ${activeTab === 'result' ? 'active' : ''}`}>
          {status !== 'ready' && (
            <div className="playground-panel-loading">
              <span className="playground-panel-loading-text">
                {status === 'initializing' && 'Starting WebContainer…'}
                {status === 'installing'   && 'Installing dependencies…'}
                {status === 'error'        && 'Failed to load preview'}
              </span>
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
        >
          {/* DevTools-style toolbar */}
          <div className="console-toolbar">
            <button
              className="console-toolbar-clear"
              onClick={clearConsole}
              title="Clear console"
              aria-label="Clear console"
            >
              <ClearIcon />
            </button>
            <div className="console-toolbar-divider" />
            <div className="console-filters">
              {(['all', 'log', 'warn', 'error', 'info'] as ConsoleFilter[]).map(f => (
                <button
                  key={f}
                  className={`console-filter-btn ${filter === f ? 'active' : ''} ${f !== 'all' ? f : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'error' && errorCount > 0 && <span className="filter-count">{errorCount}</span>}
                  {f === 'warn' && warnCount > 0 && <span className="filter-count">{warnCount}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Message list */}
          <div className="console-messages" ref={consoleRef}>
            {filtered.length === 0 ? (
              <div className="playground-console-empty">
                {consoleMessages.length === 0 ? 'No console output' : `No ${filter} messages`}
              </div>
            ) : (
              filtered.map((msg, i) => (
                <div key={`${i}-${msg.timestamp}-${msg.type}`} className={`console-row ${msg.type}`}>
                  <span className="console-row-icon" aria-label={msg.type}>
                    {msg.type === 'error' && <ErrorIcon />}
                    {msg.type === 'warn' && <WarnIcon />}
                    {msg.type === 'info' && <InfoIcon />}
                    {msg.type === 'log' && <LogIcon />}
                  </span>
                  <span className="console-row-text">{msg.text}</span>
                  <span className="console-row-time">{formatTime(msg.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div
          className={`playground-panel-terminal ${activeTab === 'terminal' ? 'active' : ''}`}
        >
          <Terminal messages={terminalMessages} />
        </div>
      </div>
    </div>
  )
}

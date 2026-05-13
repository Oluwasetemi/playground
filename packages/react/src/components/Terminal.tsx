import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export interface TerminalProps {
  /** Terminal messages to display */
  messages?: Array<{
    type: 'stdout' | 'stderr'
    text: string
    timestamp: number
  }>
  /** Custom class name */
  className?: string
  /** Terminal theme options */
  theme?: {
    background?: string
    foreground?: string
    cursor?: string
    cursorAccent?: string
    selectionBackground?: string
  }
  /** Font family */
  fontFamily?: string
  /** Font size */
  fontSize?: number
  /** Line height */
  lineHeight?: number
}

const DEFAULT_THEME = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  cursorAccent: '#1e1e1e',
  selectionBackground: '#264f78',
  black: '#1e1e1e',
  red: '#f48771',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  blue: '#6272a4',
  magenta: '#ff79c6',
  cyan: '#8be9fd',
  white: '#f8f8f2',
  brightBlack: '#6272a4',
  brightRed: '#ff5555',
  brightGreen: '#69ff94',
  brightYellow: '#ffffa5',
  brightBlue: '#d6acff',
  brightMagenta: '#ff92df',
  brightCyan: '#a4ffff',
  brightWhite: '#ffffff',
}

export function Terminal({
  messages = [],
  className = '',
  theme,
  fontFamily = 'Menlo, Monaco, "Courier New", monospace',
  fontSize = 13,
  lineHeight = 1.4,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const lastMessageIndexRef = useRef<number>(0)

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new XTerm({
      theme: { ...DEFAULT_THEME, ...theme },
      fontFamily,
      fontSize,
      lineHeight,
      cursorBlink: false,
      cursorStyle: 'block',
      disableStdin: true,
      convertEol: true,
      scrollback: 5000,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    terminal.open(containerRef.current)

    // Initial fit
    try {
      fitAddon.fit()
    } catch {
      // Ignore fit errors during initialization
    }

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon
    lastMessageIndexRef.current = 0

    return () => {
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [theme, fontFamily, fontSize, lineHeight])

  // Handle resize
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      try {
        fitAddonRef.current.fit()
      } catch {
        // Ignore fit errors
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)

    // Also observe container resize
    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [handleResize])

  // Write new messages to terminal
  useEffect(() => {
    if (!terminalRef.current) return

    // Only write new messages
    const newMessages = messages.slice(lastMessageIndexRef.current)

    for (const msg of newMessages) {
      terminalRef.current.write(msg.text)
    }

    lastMessageIndexRef.current = messages.length
  }, [messages])

  // Fit terminal when messages change (content might affect size)
  useEffect(() => {
    handleResize()
  }, [messages.length, handleResize])

  return (
    <div
      ref={containerRef}
      className={`playground-terminal-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    />
  )
}

export default Terminal

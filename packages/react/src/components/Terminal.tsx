import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import { useCallback, useEffect, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'

// Strip ANSI cursor-movement and screen-clearing sequences that cause blank
// gaps in a scrollable xterm buffer. Vite uses these to update its status
// line in place (cursor-up + clear-line), but in xterm's scrollback model
// they leave empty rows instead of overwriting. SGR color codes are kept.
/* eslint-disable no-control-regex */
function stripCursorControls(data: string): string {
  return data
    // Cursor movement: up/down/forward/back  \x1b[nA-D
    .replace(/\x1B\[\d*[A-D]/g, '')
    // Cursor position: \x1b[row;colH  \x1b[H  \x1b[row;colf
    .replace(/\x1B\[\d*(?:;\d*)?[Hf]/g, '')
    // Erase in display / erase in line: \x1b[nJ  \x1b[nK
    .replace(/\x1B\[\d*[JK]/g, '')
    // Scroll up/down: \x1b[nS  \x1b[nT
    .replace(/\x1B\[\d*[ST]/g, '')
    // Private mode set/reset (hide cursor, alt screen, etc.): \x1b[?nh
    .replace(/\x1B\[\?\d+[hl]/g, '')
    // Save / restore cursor position
    .replace(/\x1B[78]/g, '')
    .replace(/\x1B\[[su]/g, '')
}
/* eslint-enable no-control-regex */

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
    if (!containerRef.current)
      return

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

    // Defer initial fit — cancel if component unmounts before frame fires.
    const rafId = requestAnimationFrame(() => {
      try {
        fitAddon.fit()
      }
      catch {
        // terminal may have been disposed before the frame ran
      }
    })

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon
    lastMessageIndexRef.current = 0

    return () => {
      cancelAnimationFrame(rafId)
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [theme, fontFamily, fontSize, lineHeight])

  // Handle resize — always defer to next frame so the browser has applied
  // the new layout dimensions before xterm recalculates rows/cols.
  const handleResize = useCallback(() => {
    requestAnimationFrame(() => {
      if (fitAddonRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit()
        }
        catch {
          // ignore
        }
      }
    })
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
    if (!terminalRef.current)
      return

    // Reset (template switch or manual clear): wipe xterm buffer
    if (messages.length === 0) {
      terminalRef.current.clear()
      lastMessageIndexRef.current = 0
      return
    }

    // Only write new messages
    const newMessages = messages.slice(lastMessageIndexRef.current)

    for (const msg of newMessages) {
      terminalRef.current.write(stripCursorControls(msg.text))
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

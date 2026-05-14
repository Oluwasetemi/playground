import type { EventEmitter } from '../engine/EventEmitter'
import type { ConsoleMessage, PlaygroundEvents, ProcessOutput } from '../engine/types'
import { deferUntilIdle } from '../utils/lazyLoader'

export class TerminalController {
  private events: EventEmitter<PlaygroundEvents>
  private container: HTMLElement | null = null
  private lineCount: number = 0
  private maxLines: number = 1000
  private initialized: boolean = false
  private eventUnsubscribers: Array<() => void> = []
  private readonly escapeDiv = typeof document !== 'undefined' ? document.createElement('div') : null

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container
    // Sync count from the real DOM in case the container already has children
    // (e.g. React Strict Mode double-mount, hot-reload, or re-mount after switch).
    this.lineCount = container.childElementCount

    await deferUntilIdle(() => {
      if (!this.initialized) {
        this.setupEventListeners()
        this.initialized = true
      }
    })
  }

  private setupEventListeners(): void {
    const unsubProcess = this.events.on('process:output', (output) => {
      this.addOutput(output)
    })

    const unsubConsole = this.events.on('console:message', (message) => {
      this.addConsoleMessage(message)
    })

    this.eventUnsubscribers.push(unsubProcess, unsubConsole)
  }

  private appendLine(html: string): void {
    if (!this.container) return
    this.container.insertAdjacentHTML('beforeend', html)
    this.lineCount++
    if (this.lineCount > this.maxLines && this.container.firstChild) {
      this.container.removeChild(this.container.firstChild)
      this.lineCount--
    }
    this.container.scrollTop = this.container.scrollHeight
  }

  private addOutput(output: ProcessOutput): void {
    const className = output.type === 'stderr' ? 'terminal-error' : 'terminal-output'
    this.appendLine(`<div class="${className}">${this.escapeHtml(this.stripAnsi(output.data))}</div>`)
  }

  private addConsoleMessage(message: ConsoleMessage): void {
    if (message.type === 'clear') {
      this.clear()
      return
    }
    const className = `terminal-${message.type}`
    const args = message.args.map(arg => this.formatArg(arg)).join(' ')
    this.appendLine(`<div class="${className}">${this.escapeHtml(this.stripAnsi(args))}</div>`)
  }

  clear(): void {
    this.lineCount = 0
    if (this.container) this.container.innerHTML = ''
  }

  // eslint-disable-next-line no-control-regex
  private readonly ANSI_RE = /\x1B\[[0-9;]*[A-Za-z]/g

  private stripAnsi(text: string): string {
    return text.replace(this.ANSI_RE, '')
  }

  private formatArg(arg: any): string {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2)
      }
      catch {
        return String(arg)
      }
    }
    return String(arg)
  }

  private escapeHtml(text: string): string {
    if (this.escapeDiv) {
      this.escapeDiv.textContent = text
      return this.escapeDiv.innerHTML
    }
    // Fallback for non-browser environments (tests, SSR): manual replacement
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  destroy(): void {
    this.eventUnsubscribers.forEach(unsub => unsub())
    this.eventUnsubscribers = []

    this.container = null
    this.lineCount = 0
    this.initialized = false
  }
}

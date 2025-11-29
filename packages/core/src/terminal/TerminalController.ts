import type { EventEmitter } from '../engine/EventEmitter'
import type { ConsoleMessage, PlaygroundEvents, ProcessOutput } from '../engine/types'
import { deferUntilIdle } from '../utils/lazyLoader'

export class TerminalController {
  private events: EventEmitter<PlaygroundEvents>
  private container: HTMLElement | null = null
  private outputLines: (ProcessOutput | ConsoleMessage)[] = []
  private maxLines: number = 1000
  private initialized: boolean = false
  private eventUnsubscribers: Array<() => void> = []

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events
  }

  /**
   * Mount terminal (lazy initialization)
   * Event listeners are only set up when terminal is actually mounted
   */
  async mount(container: HTMLElement): Promise<void> {
    this.container = container

    // Defer initialization until idle to avoid blocking main thread
    await deferUntilIdle(() => {
      if (!this.initialized) {
        this.setupEventListeners()
        this.initialized = true
      }
      this.render()
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

  private addOutput(output: ProcessOutput): void {
    this.outputLines.push(output)

    if (this.outputLines.length > this.maxLines) {
      this.outputLines.shift()
    }

    this.render()
  }

  private addConsoleMessage(message: ConsoleMessage): void {
    this.outputLines.push(message)

    if (this.outputLines.length > this.maxLines) {
      this.outputLines.shift()
    }

    this.render()
  }

  clear(): void {
    this.outputLines = []
    this.render()
  }

  private render(): void {
    if (!this.container)
      return

    const html = this.outputLines
      .map((line) => {
        if ('data' in line) {
          const className = line.type === 'stderr' ? 'terminal-error' : 'terminal-output'
          return `<div class="${className}">${this.escapeHtml(line.data)}</div>`
        }
        else {
          const className = `terminal-${line.type}`
          const args = line.args.map(arg => this.formatArg(arg)).join(' ')
          return `<div class="${className}">${this.escapeHtml(args)}</div>`
        }
      })
      .join('')

    this.container.innerHTML = html

    this.container.scrollTop = this.container.scrollHeight
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
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  destroy(): void {
    // Unsubscribe from all events
    this.eventUnsubscribers.forEach(unsub => unsub())
    this.eventUnsubscribers = []

    this.container = null
    this.outputLines = []
    this.initialized = false
  }
}

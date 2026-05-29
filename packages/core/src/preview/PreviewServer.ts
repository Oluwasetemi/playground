import type { WebContainer } from '@webcontainer/api'
import type { EventEmitter } from '../engine/EventEmitter'
import type { ConsoleMessage, PlaygroundEvents } from '../engine/types'
import { playgroundActions } from '../state/actions'

export class PreviewServer {
  private webcontainer: WebContainer
  private events: EventEmitter<PlaygroundEvents>
  private serverUrl: string | null = null
  private iframe: HTMLIFrameElement | null = null
  private serverReadyUnsubscribe: (() => void) | null = null
  private allowedOrigins: Set<string> = new Set()
  private serverProcess: import('@webcontainer/api').WebContainerProcess | null = null
  private messageHandler: ((event: MessageEvent) => void) | null = null

  constructor(webcontainer: WebContainer, events: EventEmitter<PlaygroundEvents>) {
    this.webcontainer = webcontainer
    this.events = events
    this.setupMessageListener()
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      try {
        this.serverProcess.kill()
      }
      catch {
        // ignore — process may already be dead
      }
      this.serverProcess = null
    }
    this.serverReadyUnsubscribe?.()
    this.serverReadyUnsubscribe = null
    this.serverUrl = null
    playgroundActions.setPreviewUrl(null)
  }

  destroy(): void {
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }
  }

  async start(command: string): Promise<void> {
    // Kill any running server before starting a new one so Vite isn't still
    // watching files when we overwrite them during a template switch.
    await this.stop()

    this.serverReadyUnsubscribe = this.webcontainer.on('server-ready', (_port, url) => {
      console.warn(`Preview server ready at: ${url}`)
      this.serverUrl = url
      try {
        this.allowedOrigins.add(new URL(url).origin)
      }
      catch {
        // ignore malformed URL
      }
      this.events.emit('preview:ready', url)
      playgroundActions.setPreviewUrl(url)

      // If iframe is already mounted, update its src
      if (this.iframe) {
        this.iframe.src = url
      }
    })

    console.warn(`Starting preview server with command: ${command}`)
    const [cmd, ...args] = command.split(' ')

    // Spawn the dev server process and keep it running in background
    const proc = await this.webcontainer.spawn(cmd, args)
    this.serverProcess = proc

    // Capture and emit server output
    // eslint-disable-next-line ts/no-this-alias
    const self = this
    proc.output.pipeTo(
      new WritableStream({
        write(data) {
          console.warn('[dev-server]', data)
          // Emit terminal output event
          self.events.emit('process:output', {
            processId: 'dev-server',
            command,
            type: 'stdout',
            data,
            timestamp: Date.now(),
          })
        },
      }),
    )

    // Don't await exit - let it run in background
    proc.exit.then((code: number) => {
      if (code !== 0) {
        console.error(`Dev server exited with code ${code}`)
      }
    })
  }

  mountIframe(iframe: HTMLIFrameElement): void {
    this.iframe = iframe

    if (this.serverUrl) {
      iframe.src = this.serverUrl
    }
  }

  reload(): void {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.location.reload()
    }
  }

  getUrl(): string | null {
    return this.serverUrl
  }

  private setupMessageListener(): void {
    if (typeof window !== 'undefined') {
      this.messageHandler = (event: MessageEvent) => {
        // Only accept messages from known WebContainer server origins
        if (this.allowedOrigins.size > 0 && !this.allowedOrigins.has(event.origin)) {
          return
        }
        if (event.data && event.data.source === 'playground-console') {
          const message: ConsoleMessage = {
            type: event.data.type,
            args: event.data.args,
            timestamp: Date.now(),
          }
          this.events.emit('console:message', message)
        }
      }
      window.addEventListener('message', this.messageHandler)
    }
  }
}

import type { WebContainer } from '@webcontainer/api'
import type { EventEmitter } from '../engine/EventEmitter'
import type { ConsoleMessage, PlaygroundEvents } from '../engine/types'
import { playgroundActions } from '../state/actions'

export class PreviewServer {
  private webcontainer: WebContainer
  private events: EventEmitter<PlaygroundEvents>
  private serverUrl: string | null = null
  private iframe: HTMLIFrameElement | null = null

  constructor(webcontainer: WebContainer, events: EventEmitter<PlaygroundEvents>) {
    this.webcontainer = webcontainer
    this.events = events
    this.setupMessageListener()
  }

  async start(command: string): Promise<void> {
    // Listen for server-ready event
    this.webcontainer.on('server-ready', (_port, url) => {
      console.warn(`Preview server ready at: ${url}`)
      this.serverUrl = url
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
    const serverProcess = await this.webcontainer.spawn(cmd, args)

    // Log server output
    serverProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.warn('[dev-server]', data)
        },
      }),
    )

    // Don't await exit - let it run in background
    serverProcess.exit.then((code) => {
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

    iframe.addEventListener('load', () => {
      this.injectConsoleForwarder()
    })
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
      window.addEventListener('message', (event) => {
        if (event.data && event.data.source === 'playground-console') {
          const message: ConsoleMessage = {
            type: event.data.type,
            args: event.data.args,
            timestamp: Date.now(),
          }
          this.events.emit('console:message', message)
        }
      })
    }
  }

  private injectConsoleForwarder(): void {
    if (!this.iframe || !this.iframe.contentWindow)
      return

    try {
      const script = this.iframe.contentDocument?.createElement('script')
      if (!script)
        return

      script.textContent = `
        (function() {
          const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
          };

          ['log', 'warn', 'error', 'info'].forEach(method => {
            console[method] = function(...args) {
              originalConsole[method].apply(console, args);
              window.parent.postMessage({
                source: 'playground-console',
                type: method,
                args: args.map(arg => {
                  try {
                    if (typeof arg === 'object' && arg !== null) {
                      return JSON.parse(JSON.stringify(arg));
                    }
                    return arg;
                  } catch (e) {
                    return String(arg);
                  }
                })
              }, '*');
            };
          });

          window.addEventListener('error', (e) => {
            window.parent.postMessage({
              source: 'playground-console',
              type: 'error',
              args: [e.message, 'at', e.filename + ':' + e.lineno]
            }, '*');
          });

          window.addEventListener('unhandledrejection', (e) => {
            window.parent.postMessage({
              source: 'playground-console',
              type: 'error',
              args: ['Unhandled promise rejection:', e.reason]
            }, '*');
          });
        })();
      `

      this.iframe.contentDocument?.head.appendChild(script)
    }
    catch (error) {
      console.warn('Failed to inject console forwarder:', error)
    }
  }
}

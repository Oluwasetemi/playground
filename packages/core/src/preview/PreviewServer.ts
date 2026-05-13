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
  }

  async start(command: string): Promise<void> {
    // Kill any running server before starting a new one so Vite isn't still
    // watching files when we overwrite them during a template switch.
    await this.stop()

    // Inject console forwarder into index.html before the dev server starts so
    // Vite serves the modified file. DOM injection via contentDocument is
    // unreliable for cross-origin iframes (different port = different origin).
    await this.injectConsoleForwarderIntoHtml()

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
      window.addEventListener('message', (event) => {
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
      })
    }
  }

  private async injectConsoleForwarderIntoHtml(): Promise<void> {
    // Minified inline script that intercepts console methods and forwards them
    // to the parent frame via postMessage. Runs in the iframe's own origin so
    // window.parent.postMessage is never blocked by cross-origin policy.
    const forwarderScript = `<script data-playground-console>
(function(){var orig={log:console.log,warn:console.warn,error:console.error,info:console.info};['log','warn','error','info'].forEach(function(m){console[m]=function(){orig[m].apply(console,arguments);try{window.parent.postMessage({source:'playground-console',type:m,args:Array.prototype.slice.call(arguments).map(function(a){try{return typeof a==='object'&&a!==null?JSON.parse(JSON.stringify(a)):a}catch(e){return String(a)}})},'\x2a')}catch(e){}};});window.addEventListener('error',function(e){try{window.parent.postMessage({source:'playground-console',type:'error',args:[e.message+' at '+e.filename+':'+e.lineno]},'\x2a')}catch(_){}});window.addEventListener('unhandledrejection',function(e){try{window.parent.postMessage({source:'playground-console',type:'error',args:['Unhandled rejection: '+String(e.reason)]},'\x2a')}catch(_){}});})();
</script>`

    try {
      const html = await this.webcontainer.fs.readFile('/index.html', 'utf-8')
      // Skip if already injected (e.g. on template switch where file persists)
      if (html.includes('data-playground-console'))
        return
      // Insert immediately after <head> so it runs before any user scripts
      const modified = html.replace('<head>', `<head>\n  ${forwarderScript}`)
      await this.webcontainer.fs.writeFile('/index.html', modified)
    }
    catch {
      // No index.html in this template (e.g. Node.js-only) — skip silently
    }
  }
}

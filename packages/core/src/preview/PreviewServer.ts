import type { WebContainer } from '@webcontainer/api';
import { EventEmitter } from '../engine/EventEmitter';
import type { PlaygroundEvents, ConsoleMessage } from '../engine/types';

export class PreviewServer {
  private webcontainer: WebContainer;
  private events: EventEmitter<PlaygroundEvents>;
  private serverUrl: string | null = null;
  private iframe: HTMLIFrameElement | null = null;

  constructor(webcontainer: WebContainer, events: EventEmitter<PlaygroundEvents>) {
    this.webcontainer = webcontainer;
    this.events = events;
    this.setupMessageListener();
  }

  async start(command: string): Promise<void> {
    this.webcontainer.on('server-ready', (_port, url) => {
      this.serverUrl = url;
      this.events.emit('preview:ready', url);
    });

    const [cmd, ...args] = command.split(' ');
    await this.webcontainer.spawn(cmd, args);
  }

  mountIframe(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;

    if (this.serverUrl) {
      iframe.src = this.serverUrl;
    }

    iframe.addEventListener('load', () => {
      this.injectConsoleForwarder();
    });
  }

  reload(): void {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.location.reload();
    }
  }

  getUrl(): string | null {
    return this.serverUrl;
  }

  private setupMessageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.source === 'playground-console') {
          const message: ConsoleMessage = {
            type: event.data.type,
            args: event.data.args,
            timestamp: Date.now(),
          };
          this.events.emit('console:message', message);
        }
      });
    }
  }

  private injectConsoleForwarder(): void {
    if (!this.iframe || !this.iframe.contentWindow) return;

    try {
      const script = this.iframe.contentDocument?.createElement('script');
      if (!script) return;

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
      `;

      this.iframe.contentDocument?.head.appendChild(script);
    } catch (error) {
      console.warn('Failed to inject console forwarder:', error);
    }
  }
}

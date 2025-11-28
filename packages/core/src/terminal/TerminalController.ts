import { EventEmitter } from '../engine/EventEmitter';
import type { PlaygroundEvents, ProcessOutput, ConsoleMessage } from '../engine/types';

export class TerminalController {
  private events: EventEmitter<PlaygroundEvents>;
  private container: HTMLElement | null = null;
  private outputLines: (ProcessOutput | ConsoleMessage)[] = [];
  private maxLines: number = 1000;

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events;
    this.setupEventListeners();
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  private setupEventListeners(): void {
    this.events.on('process:output', (output) => {
      this.addOutput(output);
    });

    this.events.on('console:message', (message) => {
      this.addConsoleMessage(message);
    });
  }

  private addOutput(output: ProcessOutput): void {
    this.outputLines.push(output);

    if (this.outputLines.length > this.maxLines) {
      this.outputLines.shift();
    }

    this.render();
  }

  private addConsoleMessage(message: ConsoleMessage): void {
    this.outputLines.push(message);

    if (this.outputLines.length > this.maxLines) {
      this.outputLines.shift();
    }

    this.render();
  }

  clear(): void {
    this.outputLines = [];
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    const html = this.outputLines
      .map((line) => {
        if ('data' in line) {
          const className = line.type === 'stderr' ? 'terminal-error' : 'terminal-output';
          return `<div class="${className}">${this.escapeHtml(line.data)}</div>`;
        } else {
          const className = `terminal-${line.type}`;
          const args = line.args.map((arg) => this.formatArg(arg)).join(' ');
          return `<div class="${className}">${this.escapeHtml(args)}</div>`;
        }
      })
      .join('');

    this.container.innerHTML = html;

    this.container.scrollTop = this.container.scrollHeight;
  }

  private formatArg(arg: any): string {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy(): void {
    this.container = null;
    this.outputLines = [];
  }
}

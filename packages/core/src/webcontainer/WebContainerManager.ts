import { WebContainer, auth } from '@webcontainer/api';
import type { FileSystemTree, WebContainerProcess } from '@webcontainer/api';
import { EventEmitter } from '../engine/EventEmitter';
import type { PlaygroundEvents } from '../engine/types';

export class WebContainerManager {
  private static instance: WebContainer | null = null;
  private static bootPromise: Promise<WebContainer> | null = null;
  private events: EventEmitter<PlaygroundEvents>;
  private processes: Map<string, WebContainerProcess> = new Map();

  constructor(events: EventEmitter<PlaygroundEvents>) {
    this.events = events;
    let initiated = false;
    
    if (initiated) {
      auth.init({
        clientId: 'wc_api_oluwasetemi_4d19cedf8f057b6f5a059cc61f376076',
        scope: '',
      });
      
      initiated = true
    }
    
  }

  static async preboot(): Promise<void> {
    if (!WebContainerManager.bootPromise && !WebContainerManager.instance) {
      WebContainerManager.bootPromise = WebContainer.boot();
      WebContainerManager.instance = await WebContainerManager.bootPromise;
    }
  }

  async boot(): Promise<WebContainer> {
    if (WebContainerManager.instance) {
      return WebContainerManager.instance;
    }

    if (WebContainerManager.bootPromise) {
      return WebContainerManager.bootPromise;
    }

    try {
      WebContainerManager.bootPromise = WebContainer.boot();
      WebContainerManager.instance = await WebContainerManager.bootPromise;
      return WebContainerManager.instance;
    } catch (error) {
      WebContainerManager.bootPromise = null;
      throw new Error(
        `Failed to boot WebContainer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getInstance(): WebContainer | null {
    return WebContainerManager.instance;
  }

  async mount(files: FileSystemTree): Promise<void> {
    const instance = await this.boot();
    await instance.mount(files);
  }

  async spawn(
    command: string,
    args: string[] = [],
    options: { cwd?: string } = {}
  ): Promise<WebContainerProcess> {
    const instance = await this.boot();
    const process = await instance.spawn(command, args, options);

    const processId = `${command}-${Date.now()}`;
    this.processes.set(processId, process);

    process.output.pipeTo(
      new WritableStream({
        write: (data) => {
          this.events.emit('process:output', {
            type: 'stdout',
            data,
            timestamp: Date.now(),
          });
        },
      })
    );

    process.exit.then((code) => {
      this.processes.delete(processId);
      if (code !== 0) {
        this.events.emit('process:output', {
          type: 'stderr',
          data: `Process exited with code ${code}`,
          timestamp: Date.now(),
        });
      }
    });

    return process;
  }

  async killAll(): Promise<void> {
    const killPromises = Array.from(this.processes.values()).map((process) =>
      process.kill()
    );
    await Promise.all(killPromises);
    this.processes.clear();
  }

  onServerReady(callback: (port: number, url: string) => void): void {
    const instance = WebContainerManager.instance;
    if (instance) {
      instance.on('server-ready', callback);
    }
  }

  async teardown(): Promise<void> {
    await this.killAll();
    if (WebContainerManager.instance) {
      await WebContainerManager.instance.teardown();
      WebContainerManager.instance = null;
      WebContainerManager.bootPromise = null;
    }
  }
}

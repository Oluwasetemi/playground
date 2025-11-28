import { WebContainerManager } from '../webcontainer/WebContainerManager';
import { FileSystemManager } from '../webcontainer/FileSystemManager';
import { EditorController } from '../editor/EditorController';
import { PreviewServer } from '../preview/PreviewServer';
import { TerminalController } from '../terminal/TerminalController';
import { PersistenceManager } from '../persistence/PersistenceManager';
import { EventEmitter } from './EventEmitter';
import type {
  Template,
  PlaygroundOptions,
  PlaygroundEvents,
  PlaygroundStatus,
  PlaygroundSnapshot,
  FileNode,
} from './types';

export class PlaygroundEngine {
  private webcontainerManager: WebContainerManager;
  private filesystemManager: FileSystemManager | null = null;
  private editor: EditorController;
  private preview: PreviewServer | null = null;
  private terminal: TerminalController;
  private persistence: PersistenceManager;
  private events: EventEmitter<PlaygroundEvents>;

  private currentTemplate: Template | null = null;
  private status: PlaygroundStatus = 'initializing';
  private options: PlaygroundOptions;

  constructor(options: PlaygroundOptions = {}) {
    this.options = options;
    this.events = new EventEmitter<PlaygroundEvents>();
    this.webcontainerManager = new WebContainerManager(this.events);
    this.editor = new EditorController(this.events);
    this.terminal = new TerminalController(this.events);
    this.persistence = new PersistenceManager('default');

    this.setupEventHandlers();
  }

  static async preboot(): Promise<void> {
    await WebContainerManager.preboot();
  }

  async initialize(template: Template): Promise<void> {
    try {
      this.setStatus('initializing');
      this.currentTemplate = template;

      this.persistence = new PersistenceManager(template.id);

      const webcontainer = await this.webcontainerManager.boot();

      this.filesystemManager = new FileSystemManager(webcontainer, this.events);
      this.preview = new PreviewServer(webcontainer, this.events);

      await this.filesystemManager.mount(template.files);

      this.setStatus('installing');
      await this.installDependencies();

      await this.preview.start(template.commands.dev);

      this.setStatus('ready');

      if (this.options.autoSave) {
        this.enableAutoSave();
      }
    } catch (error) {
      this.setStatus('error');
      this.events.emit('error', error as Error);
      throw error;
    }
  }

  async updateFile(path: string, content: string): Promise<void> {
    if (!this.filesystemManager) {
      throw new Error('Filesystem not initialized');
    }

    await this.filesystemManager.writeFile(path, content);
  }

  async openFile(path: string): Promise<void> {
    if (!this.filesystemManager) {
      throw new Error('Filesystem not initialized');
    }

    const content = await this.filesystemManager.readFile(path);
    await this.editor.openFile(path, content);
  }

  async getFileTree(): Promise<FileNode[]> {
    if (!this.filesystemManager) {
      throw new Error('Filesystem not initialized');
    }

    return this.filesystemManager.getFileTree();
  }

  async mountEditor(container: HTMLElement): Promise<void> {
    this.editor.initialize(container, {
      theme: this.options.theme,
    });

    if (this.filesystemManager && this.currentTemplate) {
      try {
        const entryContent = await this.filesystemManager.readFile(this.currentTemplate.entryFile);
        await this.editor.openFile(this.currentTemplate.entryFile, entryContent);
      } catch (error) {
        console.error('Failed to open entry file:', error);
      }
    }
  }

  mountPreview(iframe: HTMLIFrameElement): void {
    if (!this.preview) {
      throw new Error('Preview not initialized');
    }

    this.preview.mountIframe(iframe);
  }

  mountTerminal(container: HTMLElement): void {
    this.terminal.mount(container);
  }

  async saveSnapshot(): Promise<void> {
    if (!this.filesystemManager || !this.currentTemplate) {
      return;
    }

    const snapshot: PlaygroundSnapshot = {
      version: 1,
      timestamp: Date.now(),
      files: await this.filesystemManager.getAllFiles(),
      openTabs: this.editor.getOpenTabs(),
      activeFile: this.editor.getActiveFile(),
      templateId: this.currentTemplate.id,
    };

    await this.persistence.saveSnapshot(snapshot);
  }

  async loadSnapshot(): Promise<void> {
    const snapshot = await this.persistence.loadSnapshot();
    if (!snapshot || !this.filesystemManager) {
      return;
    }

    for (const [path, content] of Object.entries(snapshot.files)) {
      await this.filesystemManager.writeFile(path, content);
    }

    for (const tab of snapshot.openTabs) {
      const content = snapshot.files[tab] || '';
      await this.editor.openFile(tab, content);
    }

    if (snapshot.activeFile) {
      const content = snapshot.files[snapshot.activeFile] || '';
      await this.editor.openFile(snapshot.activeFile, content);
    }
  }

  on<K extends keyof PlaygroundEvents>(event: K, handler: PlaygroundEvents[K]): () => void {
    return this.events.on(event, handler);
  }

  getStatus(): PlaygroundStatus {
    return this.status;
  }

  async cleanup(): Promise<void> {
    this.persistence.disableAutoSave();
    this.editor.destroy();
    this.terminal.destroy();
    await this.webcontainerManager.killAll();

    if (this.filesystemManager) {
      await this.clearFileSystem();
    }

    this.events.removeAllListeners();

    this.filesystemManager = null;
    this.preview = null;
    this.currentTemplate = null;
  }

  private async clearFileSystem(): Promise<void> {
    try {
      const instance = this.webcontainerManager.getInstance();
      if (!instance) return;

      const files = await instance.fs.readdir('/', { withFileTypes: true });

      for (const file of files) {
        if (file.name === 'node_modules') continue;

        try {
          await instance.fs.rm(file.name, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Failed to remove ${file.name}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to clear filesystem:', error);
    }
  }

  private async installDependencies(): Promise<void> {
    if (!this.currentTemplate || Object.keys(this.currentTemplate.dependencies).length === 0) {
      return;
    }

    try {
      const installProcess = await this.webcontainerManager.spawn('npm', ['install']);

      const exitCode = await installProcess.exit;

      if (exitCode !== 0) {
        throw new Error(`npm install failed with exit code ${exitCode}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.events.emit('error', new Error(`Failed to install dependencies: ${message}`));
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.events.on('file:change', async (path, content) => {
      if (path && path === this.editor.getActiveFile() && !path.endsWith('/')) {
        try {
          await this.updateFile(path, content);
        } catch (error) {
          console.error('Failed to update file:', error);
        }
      }
    });
  }

  private setStatus(status: PlaygroundStatus): void {
    this.status = status;
    this.events.emit('status:change', status);
  }

  private enableAutoSave(): void {
    this.persistence.enableAutoSave(
      async () => {
        if (!this.filesystemManager || !this.currentTemplate) {
          throw new Error('Cannot auto-save: playground not fully initialized');
        }

        return {
          version: 1,
          timestamp: Date.now(),
          files: await this.filesystemManager.getAllFiles(),
          openTabs: this.editor.getOpenTabs(),
          activeFile: this.editor.getActiveFile(),
          templateId: this.currentTemplate.id,
        };
      },
      this.options.autoSaveInterval
    );
  }
}

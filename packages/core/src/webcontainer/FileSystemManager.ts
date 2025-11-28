import type { WebContainer, FileSystemTree } from '@webcontainer/api';
import { EventEmitter } from '../engine/EventEmitter';
import type { FileNode, PlaygroundEvents } from '../engine/types';

export class FileSystemManager {
  private webcontainer: WebContainer;
  private events: EventEmitter<PlaygroundEvents>;
  private fileCache: Map<string, { content: string; mtime: number }> = new Map();

  constructor(webcontainer: WebContainer, events: EventEmitter<PlaygroundEvents>) {
    this.webcontainer = webcontainer;
    this.events = events;
  }

  async mount(files: FileSystemTree): Promise<void> {
    await this.webcontainer.mount(files);
    this.fileCache.clear();

    const fileTree = await this.buildFileTree('/');
    this.events.emit('files:update', fileTree);
  }

  async readFile(path: string): Promise<string> {
    try {
      const normalizedPath = this.normalizePath(path);

      const cached = this.fileCache.get(normalizedPath);

      if (cached) {
        return cached.content;
      }

      const content = await this.webcontainer.fs.readFile(normalizedPath, 'utf-8');
      this.fileCache.set(normalizedPath, { content, mtime: Date.now() });

      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);

      if (normalizedPath.endsWith('/')) {
        throw new Error(`Cannot write to directory: ${path}`);
      }

      await this.webcontainer.fs.writeFile(normalizedPath, content);

      this.fileCache.delete(normalizedPath);

      this.events.emit('file:change', normalizedPath, content);
    } catch (error) {
      throw new Error(`Failed to write file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileTree(): Promise<FileNode[]> {
    return this.buildFileTree('/');
  }

  private async buildFileTree(dirPath: string): Promise<FileNode[]> {
    try {
      const entries = await this.webcontainer.fs.readdir(dirPath, {
        withFileTypes: true,
      });

      const nodes: FileNode[] = [];

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;

        if (entry.isDirectory()) {
          const children = await this.buildFileTree(fullPath);
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children,
          });
        } else {
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          });
        }
      }

      return nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error(`Error building file tree for ${dirPath}:`, error);
      return [];
    }
  }

  private normalizePath(path: string): string {
    if (!path.startsWith('/')) {
      return `/${path}`;
    }
    return path;
  }

  async getAllFiles(): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    const collectFiles = async (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          try {
            files[node.path] = await this.readFile(node.path);
          } catch (error) {
            console.error(`Failed to read ${node.path}:`, error);
          }
        } else if (node.children) {
          await collectFiles(node.children);
        }
      }
    };

    const tree = await this.getFileTree();
    await collectFiles(tree);

    return files;
  }
}

import type { FileSystemTree, WebContainer } from '@webcontainer/api'
import type { EventEmitter } from '../engine/EventEmitter'
import type { FileNode, PlaygroundEvents } from '../engine/types'
import { playgroundActions } from '../state/actions'
import { FileWatcher } from './FileWatcher'

// Add this type definition near your imports
type FileSystemNode = FileSystemTree[string]

// Console forwarder script to inject into HTML files
const CONSOLE_FORWARDER_SCRIPT = `
<script>
(function() {
  if (window.__playgroundConsoleInjected) return;
  window.__playgroundConsoleInjected = true;

  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    clear: console.clear.bind(console)
  };

  function serialize(arg) {
    try {
      if (arg === undefined) return 'undefined';
      if (arg === null) return 'null';
      if (typeof arg === 'function') return arg.toString();
      if (typeof arg === 'object') {
        if (arg instanceof Error) return arg.message + (arg.stack ? '\\n' + arg.stack : '');
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    } catch (e) {
      return String(arg);
    }
  }

  ['log', 'warn', 'error', 'info', 'clear'].forEach(function(method) {
    console[method] = function() {
      var args = Array.prototype.slice.call(arguments);
      originalConsole[method].apply(console, args);
      try {
        window.parent.postMessage({
          source: 'playground-console',
          type: method,
          args: args.map(serialize)
        }, '*');
      } catch (e) {}
    };
  });

  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      source: 'playground-console',
      type: 'error',
      args: [e.message + ' at ' + (e.filename || 'unknown') + ':' + (e.lineno || 0)]
    }, '*');
  });

  window.addEventListener('unhandledrejection', function(e) {
    window.parent.postMessage({
      source: 'playground-console',
      type: 'error',
      args: ['Unhandled promise rejection: ' + (e.reason ? (e.reason.message || e.reason) : 'unknown')]
    }, '*');
  });
})();
</script>
`

export class FileSystemManager {
  private webcontainer: WebContainer
  private events: EventEmitter<PlaygroundEvents>
  private fileCache: Map<string, { content: string, mtime: number }> = new Map()
  private fileWatcher: FileWatcher
  private isInternalWrite = false

  constructor(webcontainer: WebContainer, events: EventEmitter<PlaygroundEvents>) {
    this.webcontainer = webcontainer
    this.events = events
    this.fileWatcher = new FileWatcher(webcontainer, events, 150)
  }

  async mount(files: FileSystemTree): Promise<void> {
    // FIX: Clear cache BEFORE mount to prevent stale reads
    this.fileCache.clear()

    // Inject console forwarder into HTML files
    const modifiedFiles = this.injectConsoleForwarder(files)

    await this.webcontainer.mount(modifiedFiles)

    const fileTree = await this.buildFileTree('/')
    this.events.emit('files:update', fileTree)
    playgroundActions.setFiles(fileTree)

    // Auto-watch the root directory for changes
    await this.fileWatcher.watch('/')
  }

  /**
   * Inject console forwarder script into HTML files
   */
  private injectConsoleForwarder(files: FileSystemTree): FileSystemTree {
    const result: FileSystemTree = {}

    for (const [name, node] of Object.entries(files) as [string, FileSystemNode][]) {
      if ('directory' in node) {
        // Recursively process directories
        result[name] = {
          directory: this.injectConsoleForwarder(node.directory),
        }
      }
      else if ('file' in node && name.endsWith('.html') && 'contents' in node.file) {
        // Inject script into HTML files
        const fileContents = node.file.contents
        const content = typeof fileContents === 'string'
          ? fileContents
          : new TextDecoder().decode(fileContents as Uint8Array)

        // Inject the script right after <head> or at the start of the file
        let modifiedContent: string
        if (content.includes('<head>')) {
          modifiedContent = content.replace('<head>', `<head>${CONSOLE_FORWARDER_SCRIPT}`)
        }
        else if (content.includes('<head ')) {
          modifiedContent = content.replace(/<head\s[^>]*>/, `\$&${CONSOLE_FORWARDER_SCRIPT}`)
        }
        else if (content.includes('<html>') || content.includes('<html ')) {
          modifiedContent = content.replace(/<html[^>]*>/, `\$&${CONSOLE_FORWARDER_SCRIPT}`)
        }
        else {
          // Prepend if no html/head tags found
          modifiedContent = CONSOLE_FORWARDER_SCRIPT + content
        }

        result[name] = {
          file: { contents: modifiedContent },
        }
      }
      else {
        // Keep other files as-is
        result[name] = node
      }
    }

    return result
  }

  /**
   * Explicitly clear file cache
   * Call this before template switches or major filesystem changes
   */
  clearCache(): void {
    this.fileCache.clear()
    console.warn('File cache cleared')
  }

  async readFile(path: string): Promise<string> {
    try {
      const normalizedPath = this.normalizePath(path)

      const cached = this.fileCache.get(normalizedPath)

      if (cached) {
        return cached.content
      }

      const content = await this.webcontainer.fs.readFile(normalizedPath, 'utf-8')
      this.fileCache.set(normalizedPath, { content, mtime: Date.now() })

      return content
    }
    catch (error) {
      throw new Error(`Failed to read file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async writeFile(path: string, content: string, options?: { silent?: boolean }): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path)

      if (normalizedPath.endsWith('/')) {
        throw new Error(`Cannot write to directory: ${path}`)
      }

      // Set flag to prevent circular event loop
      const wasSilent = this.isInternalWrite
      this.isInternalWrite = options?.silent ?? false

      await this.webcontainer.fs.writeFile(normalizedPath, content)

      this.fileCache.delete(normalizedPath)

      // Only notify file watcher if this is NOT a silent internal write
      if (!this.isInternalWrite) {
        this.fileWatcher.notifyChange(normalizedPath, content)
      }

      // Restore previous state
      this.isInternalWrite = wasSilent
    }
    catch (error) {
      this.isInternalWrite = false // Reset on error
      throw new Error(`Failed to write file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async removeFile(path: string): Promise<void> {
    await this.webcontainer.fs.rm(path, { recursive: true, force: true })
  }

  /**
   * Watch a file or directory for changes
   */
  async watchFile(path: string): Promise<void> {
    await this.fileWatcher.watch(path)
  }

  /**
   * Stop watching a file
   */
  unwatchFile(path: string): void {
    this.fileWatcher.unwatch(path)
  }

  async getFileTree(): Promise<FileNode[]> {
    return this.buildFileTree('/', 0)
  }

  private async buildFileTree(dirPath: string, depth: number = 0): Promise<FileNode[]> {
    // Guard against unbounded recursion
    const MAX_DEPTH = 10
    if (depth > MAX_DEPTH) {
      console.warn(`Maximum directory depth (${MAX_DEPTH}) exceeded at path: ${dirPath}`)
      return []
    }

    try {
      const entries = await this.webcontainer.fs.readdir(dirPath, {
        withFileTypes: true,
      })

      const visible = entries.filter(e => e.name !== 'node_modules' && !e.name.startsWith('.'))

      const nodes = await Promise.all(visible.map(async (entry): Promise<FileNode> => {
        const fullPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`
        if (entry.isDirectory()) {
          const children = await this.buildFileTree(fullPath, depth + 1)
          return { name: entry.name, path: fullPath, type: 'directory', children }
        }
        return { name: entry.name, path: fullPath, type: 'file' }
      }))

      return nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
    }
    catch (error) {
      console.error(`Error building file tree for ${dirPath}:`, error)
      return []
    }
  }

  private normalizePath(path: string): string {
    if (!path.startsWith('/')) {
      return `/${path}`
    }
    return path
  }

  async getAllFiles(): Promise<Record<string, string>> {
    const flattenTree = (nodes: FileNode[]): FileNode[] =>
      nodes.flatMap(n => n.type === 'directory' ? flattenTree(n.children ?? []) : [n])

    const tree = await this.getFileTree()
    const fileNodes = flattenTree(tree)

    const entries = await Promise.all(
      fileNodes.map(async (node) => {
        try {
          const content = await this.readFile(node.path)
          return [node.path, content] as const
        }
        catch {
          return null
        }
      }),
    )

    return Object.fromEntries(entries.filter((e): e is [string, string] => e !== null))
  }
}

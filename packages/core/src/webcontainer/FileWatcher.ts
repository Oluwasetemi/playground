import type { WebContainer } from '@webcontainer/api'
import type { EventEmitter } from '../engine/EventEmitter'
import type { PlaygroundEvents } from '../engine/types'
import { debounce } from '../utils/debounce'

/**
 * FileWatcher monitors filesystem changes and emits debounced events.
 * Based on TutorialKit's file watching pattern with 150ms debounce.
 */
export class FileWatcher {
  private events: EventEmitter<PlaygroundEvents>
  private watchedPaths: Set<string> = new Set()
  private debounceMs: number
  private debouncedEmit: (path: string, content: string) => void

  constructor(
    _webcontainer: WebContainer,
    events: EventEmitter<PlaygroundEvents>,
    debounceMs = 150,
  ) {
    this.events = events
    this.debounceMs = debounceMs

    // Create debounced emit function
    this.debouncedEmit = debounce((path: string, content: string) => {
      this.events.emit('file:change', path, content)
    }, this.debounceMs)
  }

  /**
   * Watch a file or directory for changes
   */
  async watch(path: string): Promise<void> {
    if (this.watchedPaths.has(path)) {
      return
    }

    this.watchedPaths.add(path)

    try {
      // Set up file watcher using WebContainer's file system events
      // Note: WebContainer doesn't have built-in file watching,
      // so we'll rely on manual change detection through writeFile
      console.warn(`Watching file: ${path}`)
    }
    catch (error) {
      console.error(`Failed to watch ${path}:`, error)
      this.watchedPaths.delete(path)
    }
  }

  /**
   * Stop watching a file or directory
   */
  unwatch(path: string): void {
    this.watchedPaths.delete(path)
    console.warn(`Stopped watching: ${path}`)
  }

  /**
   * Manually trigger a file change event (debounced)
   * This is used by FileSystemManager when files are written
   */
  notifyChange(path: string, content: string): void {
    if (this.watchedPaths.has(path) || this.isInWatchedDirectory(path)) {
      this.debouncedEmit(path, content)
    }
  }

  /**
   * Check if a path is within any watched directory
   */
  private isInWatchedDirectory(path: string): boolean {
    for (const watchedPath of this.watchedPaths) {
      if (path.startsWith(`${watchedPath}/`)) {
        return true
      }
    }
    return false
  }

  /**
   * Get all watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths)
  }

  /**
   * Clear all watched paths
   */
  clearAll(): void {
    this.watchedPaths.clear()
  }

  /**
   * Watch multiple paths at once
   */
  async watchMultiple(paths: string[]): Promise<void> {
    await Promise.all(paths.map(path => this.watch(path)))
  }
}

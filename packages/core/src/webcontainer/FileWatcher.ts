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

  private debouncers: Map<string, (content: string) => void> = new Map()

  constructor(
    _webcontainer: WebContainer,
    events: EventEmitter<PlaygroundEvents>,
    debounceMs = 150,
  ) {
    this.events = events
    this.debounceMs = debounceMs
  }

  /**
   * Watch a file or directory for changes
   */
  async watch(path: string): Promise<void> {
    if (this.watchedPaths.has(path))
      return

    this.watchedPaths.add(path)
  }

  /**
   * Stop watching a file or directory
   */
  unwatch(path: string): void {
    this.watchedPaths.delete(path)
    console.warn(`Stopped watching: ${path}`)
    this.debouncers.delete(path)
  }

  /**
   * Manually trigger a file change event (debounced)
   * This is used by FileSystemManager when files are written
   */
  notifyChange(path: string, content: string): void {
    if (this.watchedPaths.has(path) || this.isInWatchedDirectory(path)) {
      this.getDebouncer(path)(content)
    }
  }

  /**
   * Retrieves or create a debounced emitter specific to this file path
   */
  private getDebouncer(path: string): (content: string) => void {
    if (!this.debouncers.has(path)) {
      const debouncedFn = debounce((fileContent: string) => {
        this.events.emit('file:change', path, fileContent)
      }, this.debounceMs)

      this.debouncers.set(path, debouncedFn)
    }
    return this.debouncers.get(path)!
  }

  /**
   * Check if a path is within any watched directory
   */
  private isInWatchedDirectory(path: string): boolean {
    if (this.watchedPaths.size === 0)
      return false

    for (const watchedPath of this.watchedPaths) {
      if (path.startsWith(`${watchedPath}/`) || watchedPath === '/') {
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
    this.debouncers.clear()
  }

  /**
   * Watch multiple paths at once
   */
  async watchMultiple(paths: string[]): Promise<void> {
    await Promise.all(paths.map(path => this.watch(path)))
  }
}

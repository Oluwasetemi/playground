import type { Template } from '../engine/types'

/**
 * Template cache for avoiding redundant fetches.
 * Based on TutorialKit's caching pattern with TTL support.
 */

export interface CacheEntry {
  template: Template
  timestamp: number
}

export interface TemplateCacheOptions {
  ttl?: number // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number // Maximum number of cached templates (default: 10)
}

export class TemplateCache {
  private cache: Map<string, CacheEntry> = new Map()
  private ttl: number
  private maxSize: number

  constructor(options: TemplateCacheOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000 // 5 minutes default
    this.maxSize = options.maxSize ?? 10
  }

  /**
   * Get a template from cache if available and not expired
   */
  get(templateId: string): Template | null {
    const entry = this.cache.get(templateId)

    if (!entry) {
      return null
    }

    // Check if expired
    const now = Date.now()
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(templateId)
      return null
    }

    return entry.template
  }

  /**
   * Store a template in cache
   */
  set(templateId: string, template: Template): void {
    // Enforce max size by removing oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.getOldestKey()
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(templateId, {
      template,
      timestamp: Date.now(),
    })
  }

  /**
   * Check if a template exists in cache and is not expired
   */
  has(templateId: string): boolean {
    return this.get(templateId) !== null
  }

  /**
   * Remove a specific template from cache
   */
  remove(templateId: string): void {
    this.cache.delete(templateId)
  }

  /**
   * Clear all cached templates
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    entries: Array<{ id: string, age: number }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([id, entry]) => ({
      id,
      age: now - entry.timestamp,
    }))

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries,
    }
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now()
    let removed = 0

    for (const [id, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(id)
        removed++
      }
    }

    return removed
  }

  /**
   * Get the key of the oldest cache entry
   */
  private getOldestKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * Preload a template into cache
   */
  async preload(
    templateId: string,
    fetcher: () => Promise<Template>,
  ): Promise<Template> {
    // Check if already cached
    const cached = this.get(templateId)
    if (cached) {
      return cached
    }

    // Fetch and cache
    const template = await fetcher()
    this.set(templateId, template)

    return template
  }

  /**
   * Get or fetch a template (with automatic caching)
   */
  async getOrFetch(
    templateId: string,
    fetcher: () => Promise<Template>,
  ): Promise<Template> {
    const cached = this.get(templateId)
    if (cached) {
      console.warn(`Template cache hit: ${templateId}`)
      return cached
    }

    console.warn(`Template cache miss: ${templateId}`)
    const template = await fetcher()
    this.set(templateId, template)

    return template
  }
}

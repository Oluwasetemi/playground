import type { Template } from '../engine/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplateCache } from './TemplateCache'

function createMockTemplate(id: string): Template {
  return {
    id,
    name: `Template ${id}`,
    description: `Description for ${id}`,
    files: {},
    dependencies: {},
    devDependencies: {},
    commands: {
      dev: 'npm run dev',
      build: 'npm run build',
    },
    entryFile: 'index.js',
  }
}

describe('templateCache', () => {
  let cache: TemplateCache

  beforeEach(() => {
    cache = new TemplateCache({ ttl: 1000, maxSize: 3 })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should use default options when not provided', () => {
      const defaultCache = new TemplateCache()
      const stats = defaultCache.getStats()

      expect(stats.maxSize).toBe(10)
    })

    it('should use custom options when provided', () => {
      const customCache = new TemplateCache({ ttl: 5000, maxSize: 5 })
      const stats = customCache.getStats()

      expect(stats.maxSize).toBe(5)
    })
  })

  describe('set and get', () => {
    it('should store and retrieve a template', () => {
      const template = createMockTemplate('react')
      cache.set('react', template)

      const retrieved = cache.get('react')

      expect(retrieved).toEqual(template)
    })

    it('should return null for non-existent template', () => {
      const result = cache.get('non-existent')

      expect(result).toBeNull()
    })

    it('should return null for expired template', () => {
      const template = createMockTemplate('react')
      cache.set('react', template)

      // Advance time beyond TTL
      vi.advanceTimersByTime(1500)

      const result = cache.get('react')

      expect(result).toBeNull()
    })

    it('should delete expired entry when accessed', () => {
      const template = createMockTemplate('react')
      cache.set('react', template)

      vi.advanceTimersByTime(1500)
      cache.get('react')

      expect(cache.getStats().size).toBe(0)
    })
  })

  describe('has', () => {
    it('should return true for existing non-expired template', () => {
      cache.set('react', createMockTemplate('react'))

      expect(cache.has('react')).toBe(true)
    })

    it('should return false for non-existent template', () => {
      expect(cache.has('non-existent')).toBe(false)
    })

    it('should return false for expired template', () => {
      cache.set('react', createMockTemplate('react'))

      vi.advanceTimersByTime(1500)

      expect(cache.has('react')).toBe(false)
    })
  })

  describe('remove', () => {
    it('should remove a specific template', () => {
      cache.set('react', createMockTemplate('react'))
      cache.set('vue', createMockTemplate('vue'))

      cache.remove('react')

      expect(cache.has('react')).toBe(false)
      expect(cache.has('vue')).toBe(true)
    })

    it('should not throw when removing non-existent template', () => {
      expect(() => cache.remove('non-existent')).not.toThrow()
    })
  })

  describe('clear', () => {
    it('should remove all templates', () => {
      cache.set('react', createMockTemplate('react'))
      cache.set('vue', createMockTemplate('vue'))

      cache.clear()

      expect(cache.getStats().size).toBe(0)
    })
  })

  describe('maxSize enforcement', () => {
    it('should remove oldest entry when maxSize is exceeded', () => {
      cache.set('template1', createMockTemplate('template1'))
      vi.advanceTimersByTime(100)

      cache.set('template2', createMockTemplate('template2'))
      vi.advanceTimersByTime(100)

      cache.set('template3', createMockTemplate('template3'))
      vi.advanceTimersByTime(100)

      // This should remove template1 (oldest)
      cache.set('template4', createMockTemplate('template4'))

      expect(cache.has('template1')).toBe(false)
      expect(cache.has('template2')).toBe(true)
      expect(cache.has('template3')).toBe(true)
      expect(cache.has('template4')).toBe(true)
      expect(cache.getStats().size).toBe(3)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', () => {
      cache.set('react', createMockTemplate('react'))
      vi.advanceTimersByTime(100)
      cache.set('vue', createMockTemplate('vue'))

      const stats = cache.getStats()

      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(3)
      expect(stats.entries).toHaveLength(2)
      expect(stats.entries[0].id).toBe('react')
      expect(stats.entries[0].age).toBe(100)
      expect(stats.entries[1].id).toBe('vue')
      expect(stats.entries[1].age).toBe(0)
    })
  })

  describe('prune', () => {
    it('should remove expired entries', () => {
      cache.set('old', createMockTemplate('old'))
      vi.advanceTimersByTime(500)

      cache.set('new', createMockTemplate('new'))
      vi.advanceTimersByTime(600) // old is now 1100ms, new is 600ms

      const removed = cache.prune()

      expect(removed).toBe(1)
      expect(cache.has('old')).toBe(false)
      expect(cache.has('new')).toBe(true)
    })

    it('should return 0 when no entries are expired', () => {
      cache.set('react', createMockTemplate('react'))
      cache.set('vue', createMockTemplate('vue'))

      const removed = cache.prune()

      expect(removed).toBe(0)
    })
  })

  describe('preload', () => {
    it('should return cached template if available', async () => {
      const template = createMockTemplate('react')
      cache.set('react', template)

      const fetcher = vi.fn().mockResolvedValue(createMockTemplate('react-fetched'))

      const result = await cache.preload('react', fetcher)

      expect(result).toEqual(template)
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('should fetch and cache template if not available', async () => {
      const template = createMockTemplate('react')
      const fetcher = vi.fn().mockResolvedValue(template)

      const result = await cache.preload('react', fetcher)

      expect(result).toEqual(template)
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(cache.has('react')).toBe(true)
    })
  })

  describe('getOrFetch', () => {
    it('should return cached template on cache hit', async () => {
      const template = createMockTemplate('react')
      cache.set('react', template)

      const fetcher = vi.fn().mockResolvedValue(createMockTemplate('different'))
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await cache.getOrFetch('react', fetcher)

      expect(result).toEqual(template)
      expect(fetcher).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('Template cache hit: react')

      consoleWarnSpy.mockRestore()
    })

    it('should fetch and cache on cache miss', async () => {
      const template = createMockTemplate('react')
      const fetcher = vi.fn().mockResolvedValue(template)
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await cache.getOrFetch('react', fetcher)

      expect(result).toEqual(template)
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(cache.has('react')).toBe(true)
      expect(consoleWarnSpy).toHaveBeenCalledWith('Template cache miss: react')

      consoleWarnSpy.mockRestore()
    })
  })
})

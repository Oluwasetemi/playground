import type { PlaygroundEvents } from './types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from './EventEmitter'

describe('eventEmitter', () => {
  let emitter: EventEmitter<PlaygroundEvents>

  beforeEach(() => {
    emitter = new EventEmitter<PlaygroundEvents>()
    vi.clearAllMocks()
  })

  describe('on', () => {
    it('should register an event handler', () => {
      const handler = vi.fn()
      emitter.on('status:change', handler)
      emitter.emit('status:change', 'ready')

      expect(handler).toHaveBeenCalledWith('ready')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should allow multiple handlers for the same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('status:change', handler1)
      emitter.on('status:change', handler2)
      emitter.emit('status:change', 'installing')

      expect(handler1).toHaveBeenCalledWith('installing')
      expect(handler2).toHaveBeenCalledWith('installing')
    })

    it('should return an unsubscribe function', () => {
      const handler = vi.fn()
      const unsubscribe = emitter.on('status:change', handler)

      emitter.emit('status:change', 'ready')
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()

      emitter.emit('status:change', 'error')
      expect(handler).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })

  describe('off', () => {
    it('should remove a specific handler', () => {
      const handler = vi.fn()
      emitter.on('status:change', handler)

      emitter.emit('status:change', 'ready')
      expect(handler).toHaveBeenCalledTimes(1)

      emitter.off('status:change', handler)

      emitter.emit('status:change', 'error')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should not throw when removing a non-existent handler', () => {
      const handler = vi.fn()
      expect(() => emitter.off('status:change', handler)).not.toThrow()
    })

    it('should not affect other handlers when removing one', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('status:change', handler1)
      emitter.on('status:change', handler2)

      emitter.off('status:change', handler1)

      emitter.emit('status:change', 'ready')

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledWith('ready')
    })
  })

  describe('emit', () => {
    it('should call handlers with correct arguments', () => {
      const handler = vi.fn()
      emitter.on('file:change', handler)

      emitter.emit('file:change', '/src/index.ts', 'const x = 1')

      expect(handler).toHaveBeenCalledWith('/src/index.ts', 'const x = 1')
    })

    it('should not throw when emitting an event with no handlers', () => {
      expect(() => emitter.emit('status:change', 'ready')).not.toThrow()
    })

    it('should catch and log errors from handlers', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error')
      })
      const normalHandler = vi.fn()

      emitter.on('status:change', errorHandler)
      emitter.on('status:change', normalHandler)

      emitter.emit('status:change', 'ready')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(normalHandler).toHaveBeenCalled() // Other handlers still run

      consoleErrorSpy.mockRestore()
    })
  })

  describe('once', () => {
    it('should call handler only once', () => {
      const handler = vi.fn()
      emitter.once('status:change', handler)

      emitter.emit('status:change', 'ready')
      emitter.emit('status:change', 'error')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith('ready')
    })

    it('should automatically unsubscribe after first call', () => {
      const handler = vi.fn()
      emitter.once('status:change', handler)

      emitter.emit('status:change', 'ready')
      emitter.emit('status:change', 'installing')
      emitter.emit('status:change', 'error')

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const statusHandler = vi.fn()
      const fileHandler = vi.fn()

      emitter.on('status:change', statusHandler)
      emitter.on('file:change', fileHandler)

      emitter.removeAllListeners('status:change')

      emitter.emit('status:change', 'ready')
      emitter.emit('file:change', '/test.ts', 'content')

      expect(statusHandler).not.toHaveBeenCalled()
      expect(fileHandler).toHaveBeenCalled()
    })

    it('should remove all listeners when called without arguments', () => {
      const statusHandler = vi.fn()
      const fileHandler = vi.fn()

      emitter.on('status:change', statusHandler)
      emitter.on('file:change', fileHandler)

      emitter.removeAllListeners()

      emitter.emit('status:change', 'ready')
      emitter.emit('file:change', '/test.ts', 'content')

      expect(statusHandler).not.toHaveBeenCalled()
      expect(fileHandler).not.toHaveBeenCalled()
    })
  })
})

import type { PlaygroundOptions, Template } from '@playground/core'
import { useStore } from '@nanostores/react'
import {
  $files,
  $playgroundStatus,
  $previewUrl,
  PlaygroundEngine,

} from '@playground/core'
import { useCallback, useEffect, useRef } from 'react'

export function usePlayground(template: Template, options?: PlaygroundOptions) {
  const engineRef = useRef<PlaygroundEngine | null>(null)
  const previousTemplateId = useRef<string | null>(null)
  const initializingRef = useRef(false)

  // Subscribe to Nanostores instead of local state
  const status = useStore($playgroundStatus)
  const files = useStore($files)
  const previewUrl = useStore($previewUrl)

  useEffect(() => {
    // On first mount, create engine and do full initialization
    if (!engineRef.current) {
      const engine = new PlaygroundEngine(options)
      engineRef.current = engine

      // Only subscribe to error events (state is handled by Nanostores)
      const unsubscribeError = engine.on('error', (error) => {
        console.error('Playground error:', error)
      })

      // Mark as initializing
      initializingRef.current = true

      engine.initialize(template)
        .then(() => {
          initializingRef.current = false
        })
        .catch((error) => {
          console.error('Failed to initialize playground:', error)
          initializingRef.current = false
        })

      previousTemplateId.current = template.id

      return () => {
        // Don't cleanup if still initializing (React strict mode double-mount)
        if (initializingRef.current) {
          console.warn('Skipping cleanup - initialization still in progress')
          return
        }

        // CRITICAL: Save snapshot BEFORE cleanup to prevent data loss
        engine.saveSnapshot()
          .catch((err) => {
            console.warn('Failed to save snapshot on cleanup:', err)
          })
          .finally(() => {
            unsubscribeError()
            engine.cleanup()
            engineRef.current = null
          })
      }
    }

    // On subsequent renders with different template, use smart switching
    if (previousTemplateId.current !== template.id) {
      console.warn(`Template change detected: ${previousTemplateId.current} -> ${template.id}`)

      engineRef.current.switchTemplate(template).catch((error) => {
        console.error('Failed to switch template:', error)
        // Fallback to full re-initialization
        engineRef.current?.cleanup()
        const engine = new PlaygroundEngine(options)
        engineRef.current = engine
        engine.initialize(template)
      })

      previousTemplateId.current = template.id
    }
  }, [template.id])

  const updateFile = useCallback(async (path: string, content: string) => {
    if (engineRef.current) {
      await engineRef.current.updateFile(path, content)
    }
  }, [])

  const openFile = useCallback(async (path: string) => {
    if (engineRef.current) {
      await engineRef.current.openFile(path)
    }
  }, [])

  const saveSnapshot = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.saveSnapshot()
    }
  }, [])

  return {
    engine: engineRef.current,
    status,
    files,
    previewUrl,
    updateFile,
    openFile,
    saveSnapshot,
  }
}

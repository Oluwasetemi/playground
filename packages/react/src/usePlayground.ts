import type { PlaygroundOptions, ProcessOutput, Template } from '@setemiojo/playground-core'
import type { ConsoleMessage, TerminalMessage } from './context/PlaygroundContext'
import { useStore } from '@nanostores/react'
import {
  $files,
  $playgroundStatus,
  $previewUrl,
  PlaygroundEngine,
} from '@setemiojo/playground-core'
import { useCallback, useEffect, useRef, useState } from 'react'

export function usePlayground(template: Template, options?: PlaygroundOptions) {
  const engineRef = useRef<PlaygroundEngine | null>(null)
  const previousTemplateId = useRef<string | null>(null)
  const initializingRef = useRef(false)
  const templateRef = useRef<Template>(template)

  // Subscribe to Nanostores instead of local state
  const status = useStore($playgroundStatus)
  const files = useStore($files)
  const previewUrl = useStore($previewUrl)

  // Local state for new features
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>([])

  // Keep template ref up to date
  useEffect(() => {
    templateRef.current = template
  }, [template])

  useEffect(() => {
    // On first mount, create engine and do full initialization
    if (!engineRef.current) {
      const engine = new PlaygroundEngine(options)
      engineRef.current = engine

      // Subscribe to error events
      const unsubscribeError = engine.on('error', (error) => {
        console.error('Playground error:', error)
        setConsoleMessages(prev => [...prev, {
          type: 'error',
          text: error.message,
          timestamp: Date.now(),
        }])
      })

      // Subscribe to console messages
      const unsubscribeConsole = engine.on('console:message', (message: { type: string, args: any[] }) => {
        setConsoleMessages(prev => [...prev, {
          type: message.type as 'log' | 'error' | 'warn' | 'info',
          text: message.args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
          ).join(' '),
          timestamp: Date.now(),
        }])
      })

      // Subscribe to terminal/process output
      const unsubscribeTerminal = engine.on('process:output', (output: ProcessOutput) => {
        setTerminalMessages(prev => [...prev, {
          type: output.type,
          text: output.data,
          timestamp: output.timestamp,
        }])
      })

      // Mark as initializing
      initializingRef.current = true

      engine.initialize(template)
        .then(() => {
          initializingRef.current = false
        })
        .catch((error: Error) => {
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
          .catch((err: Error) => {
            console.warn('Failed to save snapshot on cleanup:', err)
          })
          .finally(() => {
            unsubscribeError()
            unsubscribeConsole()
            unsubscribeTerminal()
            engine.cleanup()
            engineRef.current = null
          })
      }
    }

    // On subsequent renders with different template, use smart switching
    if (previousTemplateId.current !== template.id) {
      console.warn(`Template change detected: ${previousTemplateId.current} -> ${template.id}`)

      // Clear console and terminal on template switch
      setConsoleMessages([])
      setTerminalMessages([])

      engineRef.current.switchTemplate(template).catch((error: Error) => {
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

  const toggleLineNumbers = useCallback(() => {
    setShowLineNumbers((prev) => {
      const newValue = !prev
      if (engineRef.current) {
        engineRef.current.setLineNumbers(newValue)
      }
      return newValue
    })
  }, [])

  const formatCode = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.formatCode()
    }
  }, [])

  const resetCode = useCallback(async () => {
    if (engineRef.current && templateRef.current) {
      await engineRef.current.resetToTemplate(templateRef.current)
      setConsoleMessages([])
    }
  }, [])

  const openInStackBlitz = useCallback(async () => {
    if (engineRef.current && templateRef.current) {
      await engineRef.current.openInStackBlitz(templateRef.current)
    }
  }, [])

  const clearConsole = useCallback(() => {
    setConsoleMessages([])
  }, [])

  const clearTerminal = useCallback(() => {
    setTerminalMessages([])
  }, [])

  return {
    engine: engineRef.current,
    status,
    files,
    previewUrl,
    updateFile,
    openFile,
    saveSnapshot,
    toggleLineNumbers,
    showLineNumbers,
    formatCode,
    resetCode,
    openInStackBlitz,
    consoleMessages,
    clearConsole,
    terminalMessages,
    clearTerminal,
    template,
    hiddenFiles: template.hiddenFiles ?? [],
  }
}

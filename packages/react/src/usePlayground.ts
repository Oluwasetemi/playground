import type { PlaygroundOptions, ProcessOutput, Template } from '@setemiojo/playground-core'
import type { ConsoleMessage, TerminalMessage } from './context/PlaygroundContext'
import { useStore } from '@nanostores/react'
import {
  $files,
  $playgroundStatus,
  $previewUrl,
  PlaygroundEngine,
} from '@setemiojo/playground-core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function usePlayground(template: Template, options?: PlaygroundOptions) {
  const engineRef = useRef<PlaygroundEngine | null>(null)
  const previousTemplateId = useRef<string | null>(null)
  const initializingRef = useRef(false)
  const templateRef = useRef<Template>(template)

  const status = useStore($playgroundStatus)
  const files = useStore($files)
  const previewUrl = useStore($previewUrl)

  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>([])

  useEffect(() => {
    templateRef.current = template
  }, [template])

  // ── Effect 1: initialization + template switching + subscriptions ──────────
  // Cleanup here ONLY unsubscribes events. Engine teardown lives in Effect 2.
  // This prevents the [template.id] re-run cleanup from tearing down the
  // WebContainer while switchTemplate() is still running mid-operation.
  useEffect(() => {
    if (!engineRef.current) {
      const engine = new PlaygroundEngine(options)
      engineRef.current = engine
      initializingRef.current = true

      engine.initialize(template)
        .then(() => { initializingRef.current = false })
        .catch((error: Error) => {
          console.error('Failed to initialize playground:', error)
          initializingRef.current = false
        })

      previousTemplateId.current = template.id
    }
    else if (previousTemplateId.current !== template.id) {
      console.warn(`Template change detected: ${previousTemplateId.current} -> ${template.id}`)
      // Clear console and terminal on template switch
      setConsoleMessages([])
      setTerminalMessages([])

      engineRef.current.switchTemplate(template).catch((error: Error) => {
        console.error('Failed to switch template:', error)
      })

      previousTemplateId.current = template.id
    }

    // Always subscribe for this effect instance so Strict Mode double-mount
    // re-attaches listeners to the existing engine.
    const engine = engineRef.current!
    const unsubscribeError = engine.on('error', (error) => {
      console.error('Playground error:', error)
      setConsoleMessages(prev => [...prev, {
        type: 'error',
        text: error.message,
        timestamp: Date.now(),
      }])
    })
    const unsubscribeConsole = engine.on('console:message', (message: { type: string, args: any[] }) => {
      if (message.type === 'clear') {
        setConsoleMessages([])
        return
      }
      setConsoleMessages((prev) => {
        const next = [...prev, {
          type: message.type as 'log' | 'error' | 'warn' | 'info',
          text: message.args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
          ).join(' '),
          timestamp: Date.now(),
        }]
        return next.length > 500 ? next.slice(-500) : next
      })
    })
    const unsubscribeTerminal = engine.on('process:output', (output: ProcessOutput) => {
      setTerminalMessages((prev) => {
        const next = [...prev, {
          type: output.type,
          text: output.data,
          timestamp: output.timestamp,
        }]
        return next.length > 1000 ? next.slice(-1000) : next
      })
    })

    return () => {
      unsubscribeError()
      unsubscribeConsole()
      unsubscribeTerminal()
      // No engine teardown here — that belongs in the unmount-only effect below.
    }
  }, [template.id])

  // ── Effect 2: engine teardown on component unmount only ───────────────────
  // Empty deps means this cleanup runs once, when the Playground unmounts.
  // It never fires on template switches, so switchTemplate() can't be aborted.
  useEffect(() => {
    return () => {
      if (initializingRef.current) {
        console.warn('Skipping engine cleanup - initialization still in progress')
        return
      }
      const engine = engineRef.current
      if (!engine) return

      engine.saveSnapshot()
        .catch((err: Error) => {
          console.warn('Failed to save snapshot on cleanup:', err)
        })
        .finally(() => {
          engine.cleanup()
          engineRef.current = null
        })
    }
  }, [])

  // ── Effect 3: hot-swap editor adapter when options.editor changes ─────────
  // Only runs after the engine exists and status is 'ready' so we never
  // interrupt an in-progress install.
  const editorType = options?.editor ?? 'codemirror'
  const prevEditorTypeRef = useRef(editorType)
  useEffect(() => {
    if (prevEditorTypeRef.current === editorType) return
    prevEditorTypeRef.current = editorType
    if (!engineRef.current || status !== 'ready') return
    engineRef.current.switchEditorType(editorType).catch((err: Error) => {
      console.error('Failed to switch editor type:', err)
    })
  }, [editorType, status])

  const updateFile = useCallback(async (path: string, content: string) => {
    if (engineRef.current) {
      await engineRef.current.updateFile(path, content)
    }
  }, [])

  const openFile = useCallback(async (path: string) => {
    if (engineRef.current) {
      await engineRef.current.openFile(path).catch((err: Error) => {
        console.error(`Failed to open file ${path}:`, err)
      })
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

  const stableValue = useMemo(() => ({
    updateFile,
    openFile,
    saveSnapshot,
    toggleLineNumbers,
    formatCode,
    resetCode,
    openInStackBlitz,
    clearConsole,
    clearTerminal,
    hiddenFiles: template.hiddenFiles ?? [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [updateFile, openFile, saveSnapshot, toggleLineNumbers, formatCode, resetCode, openInStackBlitz, clearConsole, clearTerminal, template.hiddenFiles])

  // engine is read from the ref on every render so it's always current.
  // Refs don't trigger re-renders, so this must live in volatileValue (rebuilt
  // every render) rather than in the memoized stableValue.
  const volatileValue = {
    engine: engineRef.current,
    status,
    files,
    previewUrl,
    showLineNumbers,
    consoleMessages,
    terminalMessages,
    template,
  }

  return {
    stableValue,
    volatileValue,
    // flat spread for usePlayground consumers (usePlaygroundContext merges them)
    ...stableValue,
    ...volatileValue,
  }
}

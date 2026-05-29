import type { PlaygroundOptions, ProcessOutput, Template } from '@setemiojo/playground-core'
import type { ConsoleMessage, TerminalMessage } from '../context/PlaygroundContext'
import type { Ref } from 'vue'
import { useStore } from '@nanostores/vue'
import {
  $files,
  $playgroundStatus,
  $previewUrl,
  PlaygroundEngine,
} from '@setemiojo/playground-core'
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'

export function usePlayground(templateRef: Ref<Template>, optionsRef?: Ref<PlaygroundOptions | undefined>) {
  const engine = shallowRef<PlaygroundEngine | null>(null)
  const previousTemplateId = ref<string | null>(null)
  const initializing = ref(false)
  const showLineNumbers = ref(true)
  const consoleMessages = ref<ConsoleMessage[]>([])
  const terminalMessages = ref<TerminalMessage[]>([])

  const status = useStore($playgroundStatus)
  const files = useStore($files)
  const previewUrl = useStore($previewUrl)

  const currentTemplate = ref<Template>(templateRef.value)
  watch(templateRef, (t) => { currentTemplate.value = t })

  let unsubError: (() => void) | null = null
  let unsubConsole: (() => void) | null = null
  let unsubTerminal: (() => void) | null = null

  function subscribeEvents() {
    const eng = engine.value
    if (!eng) return

    unsubError = eng.on('error', (error: Error) => {
      const next = [...consoleMessages.value, { type: 'error' as const, text: error.message, timestamp: Date.now() }]
      consoleMessages.value = next.length > 500 ? next.slice(-500) : next
    })

    unsubConsole = eng.on('console:message', (msg: { type: string, args: unknown[] }) => {
      if (msg.type === 'clear') { consoleMessages.value = []; return }
      const text = msg.args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
      const next = [...consoleMessages.value, { type: msg.type as ConsoleMessage['type'], text, timestamp: Date.now() }]
      consoleMessages.value = next.length > 500 ? next.slice(-500) : next
    })

    unsubTerminal = eng.on('process:output', (output: ProcessOutput) => {
      const next = [...terminalMessages.value, { type: output.type, text: output.data, timestamp: output.timestamp }]
      terminalMessages.value = next.length > 1000 ? next.slice(-1000) : next
    })
  }

  function unsubscribeEvents() {
    unsubError?.(); unsubConsole?.(); unsubTerminal?.()
    unsubError = null; unsubConsole = null; unsubTerminal = null
  }

  watch(
    () => templateRef.value.id,
    async (id) => {
      if (!engine.value) {
        const eng = new PlaygroundEngine(optionsRef?.value)
        engine.value = eng
        initializing.value = true
        subscribeEvents()

        await eng.initialize(templateRef.value).catch((err: Error) => {
          console.error('Failed to initialize playground:', err)
        })
        initializing.value = false
        previousTemplateId.value = id
      }
      else if (previousTemplateId.value !== id) {
        unsubscribeEvents()
        consoleMessages.value = []
        terminalMessages.value = []
        await engine.value.switchTemplate(templateRef.value).catch((err: Error) => {
          console.error('Failed to switch template:', err)
        })
        subscribeEvents()
        previousTemplateId.value = id
      }
    },
    { immediate: true },
  )

  const editorType = computed(() => optionsRef?.value?.editor ?? 'codemirror')
  const pendingEditorType = ref<'codemirror' | 'monaco' | null>(null)

  async function applyEditorType(type: 'codemirror' | 'monaco') {
    if (!engine.value || status.value !== 'ready')
      return false
    await engine.value.switchEditorType(type).catch((err: Error) => {
      console.error('Failed to switch editor type:', err)
    })
    return true
  }

  watch(editorType, async (type, prev) => {
    if (type === prev)
      return
    const applied = await applyEditorType(type)
    if (!applied)
      pendingEditorType.value = type
  })

  watch(status, async (s) => {
    if (s !== 'ready' || pendingEditorType.value === null)
      return
    const type = pendingEditorType.value
    pendingEditorType.value = null
    await applyEditorType(type)
  })

  onUnmounted(async () => {
    unsubscribeEvents()
    const eng = engine.value
    if (!eng || initializing.value) return
    await eng.saveSnapshot().catch((err: Error) => { console.warn('Failed to save snapshot:', err) })
    eng.cleanup()
    engine.value = null
  })

  const hiddenFiles = computed(() => templateRef.value.hiddenFiles ?? [])

  async function updateFile(path: string, content: string) { await engine.value?.updateFile(path, content) }
  async function openFile(path: string) { await engine.value?.openFile(path).catch((e: Error) => console.error(e)) }
  async function saveSnapshot() { await engine.value?.saveSnapshot() }
  function toggleLineNumbers() { showLineNumbers.value = !showLineNumbers.value; engine.value?.setLineNumbers(showLineNumbers.value) }
  async function formatCode() { await engine.value?.formatCode() }
  async function resetCode() {
    if (!engine.value || !currentTemplate.value) return
    await engine.value.resetToTemplate(currentTemplate.value)
    consoleMessages.value = []
    terminalMessages.value = []
  }
  async function openInStackBlitz() {
    if (!engine.value || !currentTemplate.value) return
    await engine.value.openInStackBlitz(currentTemplate.value)
  }
  function clearConsole() { consoleMessages.value = [] }
  function clearTerminal() { terminalMessages.value = [] }

  return {
    updateFile, openFile, saveSnapshot, toggleLineNumbers, formatCode,
    resetCode, openInStackBlitz, clearConsole, clearTerminal, hiddenFiles,
    engine, status, files, previewUrl, showLineNumbers,
    consoleMessages, terminalMessages, template: currentTemplate,
  }
}

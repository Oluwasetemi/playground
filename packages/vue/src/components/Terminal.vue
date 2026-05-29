<template>
  <div
    ref="containerRef"
    class="playground-terminal-container"
    :class="className"
    style="width:100%;height:100%;overflow:hidden"
  />
</template>

<script setup lang="ts">
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { onMounted, onUnmounted, ref, watch } from 'vue'

interface TerminalMessage {
  type: 'stdout' | 'stderr'
  text: string
  timestamp: number
}

const props = withDefaults(defineProps<{
  messages?: TerminalMessage[]
  className?: string
  theme?: {
    background?: string
    foreground?: string
    cursor?: string
    cursorAccent?: string
    selectionBackground?: string
  }
  fontFamily?: string
  fontSize?: number
  lineHeight?: number
}>(), {
  messages: () => [],
  className: '',
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  fontSize: 13,
  lineHeight: 1.4,
})

const DEFAULT_THEME = {
  background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#d4d4d4',
  cursorAccent: '#1e1e1e', selectionBackground: '#264f78',
  black: '#1e1e1e', red: '#f48771', green: '#50fa7b', yellow: '#f1fa8c',
  blue: '#6272a4', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
  brightBlack: '#6272a4', brightRed: '#ff5555', brightGreen: '#69ff94',
  brightYellow: '#ffffa5', brightBlue: '#d6acff', brightMagenta: '#ff92df',
  brightCyan: '#a4ffff', brightWhite: '#ffffff',
}

function stripCursorControls(data: string): string {
  return data
    .replace(/\x1b\[\d*[ABCD]/g, '')
    .replace(/\x1b\[\d*;?\d*[Hf]/g, '')
    .replace(/\x1b\[\d*[JK]/g, '')
    .replace(/\x1b\[\d*[ST]/g, '')
    .replace(/\x1b\[\?\d+[hl]/g, '')
    .replace(/\x1b[78]/g, '')
    .replace(/\x1b\[[su]/g, '')
}

const containerRef = ref<HTMLDivElement | null>(null)
let terminal: XTerm | null = null
let fitAddon: FitAddon | null = null
let lastMessageIndex = 0
let rafId = 0

function handleResize() {
  rafId = requestAnimationFrame(() => {
    try { fitAddon?.fit() }
    catch { /* disposed */ }
  })
}

onMounted(() => {
  if (!containerRef.value) return

  terminal = new XTerm({
    theme: { ...DEFAULT_THEME, ...props.theme },
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    lineHeight: props.lineHeight,
    cursorBlink: false,
    cursorStyle: 'block',
    disableStdin: true,
    convertEol: true,
    scrollback: 5000,
    allowProposedApi: true,
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(containerRef.value)

  rafId = requestAnimationFrame(() => {
    try { fitAddon?.fit() }
    catch { /* disposed */ }
  })

  lastMessageIndex = 0

  window.addEventListener('resize', handleResize)

  const observer = new ResizeObserver(handleResize)
  if (containerRef.value) observer.observe(containerRef.value)

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', handleResize)
    observer.disconnect()
    terminal?.dispose()
    terminal = null
    fitAddon = null
  })
})

// Write only new messages incrementally
watch(
  () => props.messages,
  (messages) => {
    if (!terminal) return
    const newMsgs = messages.slice(lastMessageIndex)
    for (const msg of newMsgs) {
      terminal.write(stripCursorControls(msg.text))
    }
    lastMessageIndex = messages.length
    handleResize()
  },
  { deep: true },
)
</script>

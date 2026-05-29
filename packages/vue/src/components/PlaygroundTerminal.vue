<template>
  <div class="playground-terminal">
    <div class="terminal-header">Console</div>
    <div ref="containerRef" class="terminal-content" />
  </div>
</template>

<script setup lang="ts">
import type { PlaygroundEngine } from '@setemiojo/playground-core'
import { ref, watch } from 'vue'
import { usePlaygroundContext } from '../context/PlaygroundContext'

const { engine, status } = usePlaygroundContext()
const containerRef = ref<HTMLDivElement | null>(null)
// Tracks which engine instance has been mounted to avoid double-mounting
const mountedEngine = ref<PlaygroundEngine | null>(null)

watch(
  [containerRef, engine, status],
  ([container, eng, s]) => {
    if (container && eng && s === 'ready' && mountedEngine.value !== eng) {
      mountedEngine.value = eng
      eng.mountTerminal(container)
    }
  },
  { flush: 'post' },
)

// Reset on engine change so the new instance gets mounted when ready
watch(engine, () => { mountedEngine.value = null })
</script>

<script setup lang="ts">
import type { PlaygroundOptions, Template } from '@setemiojo/playground-core'
import { toRef } from 'vue'
import { usePlayground } from './composables/usePlayground'
import { providePlaygroundStable, providePlaygroundVolatile } from './context/PlaygroundContext'

const props = defineProps<{
  template: Template
  options?: PlaygroundOptions
}>()

const templateRef = toRef(props, 'template')
const optionsRef = toRef(props, 'options')

const {
  updateFile,
  openFile,
  saveSnapshot,
  toggleLineNumbers,
  formatCode,
  resetCode,
  openInStackBlitz,
  clearConsole,
  clearTerminal,
  hiddenFiles,
  engine,
  status,
  files,
  previewUrl,
  showLineNumbers,
  consoleMessages,
  terminalMessages,
  template,
} = usePlayground(templateRef, optionsRef)

providePlaygroundStable({
  updateFile,
  openFile,
  saveSnapshot,
  toggleLineNumbers,
  formatCode,
  resetCode,
  openInStackBlitz,
  clearConsole,
  clearTerminal,
  hiddenFiles,
})

providePlaygroundVolatile({
  engine,
  status,
  files,
  previewUrl,
  showLineNumbers,
  consoleMessages,
  terminalMessages,
  template,
})
</script>

<template>
  <slot />
</template>

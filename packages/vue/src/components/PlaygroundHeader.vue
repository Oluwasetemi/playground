<template>
  <div class="playground-header" :data-status="status">
    <div class="playground-header-title">{{ title }}</div>
    <div class="playground-header-actions">
      <button
        v-if="onToggleSidebar"
        class="playground-header-btn"
        :title="showSidebar ? 'Hide sidebar' : 'Show sidebar'"
        :aria-label="showSidebar ? 'Hide sidebar' : 'Show sidebar'"
        @click="onToggleSidebar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>

      <button
        :class="['playground-header-btn', showLineNumbers ? 'active' : '']"
        :disabled="!isReady"
        title="Toggle line numbers"
        aria-label="Toggle line numbers"
        @click="toggleLineNumbers"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
          <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
        </svg>
      </button>

      <button class="playground-header-btn" :disabled="!isReady" title="Format code" aria-label="Format code" @click="formatCode">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>

      <button class="playground-header-btn" :disabled="!isReady" title="Reset to original" aria-label="Reset to original" @click="resetCode">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>

      <button class="playground-header-btn" :disabled="!isReady" title="Open in StackBlitz" aria-label="Open in StackBlitz" @click="openInStackBlitz">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlaygroundContext } from '../context/PlaygroundContext'

// Props are auto-available in <template> without binding to a variable
withDefaults(defineProps<{
  title?: string
  onToggleSidebar?: (() => void) | undefined
  showSidebar?: boolean
}>(), {
  title: 'Playground',
  showSidebar: true,
})

const { status, toggleLineNumbers, formatCode, resetCode, openInStackBlitz, showLineNumbers } = usePlaygroundContext()

// Computed values used in <template> are auto-unwrapped as plain values
const isReady = computed(() => status.value === 'ready')
</script>

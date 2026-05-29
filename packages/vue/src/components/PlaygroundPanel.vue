<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlaygroundContext } from '../context/PlaygroundContext'
import Terminal from './Terminal.vue'

withDefaults(defineProps<{ defaultTab?: 'result' | 'console' | 'terminal' }>(), { defaultTab: 'result' })

const { engine, previewUrl, status, consoleMessages, clearConsole, terminalMessages } = usePlaygroundContext()

const tabs = ['result', 'console', 'terminal'] as const
const filterOptions = ['all', 'log', 'warn', 'error', 'info'] as const
type ConsoleFilter = typeof filterOptions[number]

const activeTab = ref<'result' | 'console' | 'terminal'>('result')
const filter = ref<ConsoleFilter>('all')
const inputUrl = ref('')
const iframeLoading = ref(false)
const iframeRef = ref<HTMLIFrameElement | null>(null)
const consoleRef = ref<HTMLDivElement | null>(null)
// .value needed in <script>; templates auto-unwrap top-level refs from <script setup>
const isReady = computed(() => status.value === 'ready' && !!previewUrl.value)
const errorCount = computed(() => consoleMessages.value.filter(m => m.type === 'error').length)
const warnCount = computed(() => consoleMessages.value.filter(m => m.type === 'warn').length)
const filtered = computed(() =>
  filter.value === 'all' ? consoleMessages.value : consoleMessages.value.filter(m => m.type === filter.value),
)

// Re-mount the iframe whenever previewUrl becomes non-null (handles template switches
// where stop() clears the URL to null before the new server fires server-ready).
// Using flush:'post' ensures iframeRef is attached to the DOM first.
watch(previewUrl, (url) => {
  if (!url)
    return
  inputUrl.value = url
  iframeLoading.value = true
  if (iframeRef.value && engine.value) {
    engine.value.mountPreview(iframeRef.value)
  }
}, { flush: 'post' })

watch([() => consoleMessages.value.length, activeTab], ([, tab]) => {
  if (tab === 'console' && consoleRef.value) {
    consoleRef.value.scrollTop = consoleRef.value.scrollHeight
  }
})

function handleUrlSubmit() {
  if (!iframeRef.value || !inputUrl.value)
    return
  iframeLoading.value = true
  iframeRef.value.src = inputUrl.value
}

function handleRefresh() {
  if (!iframeRef.value)
    return
  iframeLoading.value = true
  // eslint-disable-next-line no-self-assign
  iframeRef.value.src = iframeRef.value.src
}

function openNewTab() {
  window.open(inputUrl.value || previewUrl.value || '', '_blank')
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`
}
</script>

<template>
  <div class="playground-panel">
    <div class="playground-panel-header">
      <div class="playground-panel-tabs">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="playground-panel-tab" :class="[activeTab === tab ? 'active' : '']"
          @click="activeTab = tab"
        >
          {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
          <span
            v-if="tab === 'console' && consoleMessages.length > 0"
            class="console-badge" :class="[errorCount > 0 ? 'error' : warnCount > 0 ? 'warn' : 'log']"
          >{{ consoleMessages.length }}</span>
        </button>
      </div>

      <form v-if="activeTab === 'result'" class="panel-url-form" @submit.prevent="handleUrlSubmit">
        <div class="panel-url-bar">
          <span v-if="iframeLoading && isReady" class="panel-url-spinner" aria-hidden="true" />
          <span v-else class="panel-url-dot" :data-ready="isReady" aria-hidden="true" />
          <input
            v-model="inputUrl"
            type="text"
            class="panel-url-input"
            :disabled="!isReady"
            spellcheck="false"
            aria-label="Preview URL"
            placeholder="Waiting for server…"
          >
        </div>
      </form>

      <div class="playground-panel-actions">
        <template v-if="activeTab === 'result'">
          <button class="playground-panel-action-btn" :disabled="!isReady" title="Refresh preview" aria-label="Refresh preview" @click="handleRefresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <button class="playground-panel-action-btn" :disabled="!isReady" title="Open in new tab" aria-label="Open in new tab" @click="openNewTab">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </template>
      </div>
    </div>

    <div class="playground-panel-content">
      <div class="playground-panel-result" :class="[activeTab === 'result' ? 'active' : '']">
        <div v-if="status !== 'ready'" class="playground-panel-loading">
          <span class="playground-panel-loading-text">
            <template v-if="status === 'initializing'">Starting WebContainer…</template>
            <template v-else-if="status === 'installing'">Installing dependencies…</template>
            <template v-else-if="status === 'error'">Failed to load preview</template>
          </span>
        </div>
        <iframe
          ref="iframeRef"
          title="Preview"
          class="playground-panel-iframe"
          :style="{ display: previewUrl ? 'block' : 'none' }"
          @load="iframeLoading = false"
        />
      </div>

      <div class="playground-panel-console" :class="[activeTab === 'console' ? 'active' : '']">
        <div class="console-toolbar">
          <button class="console-toolbar-clear" title="Clear console" aria-label="Clear console" @click="clearConsole">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </button>
          <div class="console-toolbar-divider" />
          <div class="console-filters">
            <button
              v-for="f in filterOptions"
              :key="f"
              class="console-filter-btn" :class="[filter === f ? 'active' : '', f !== 'all' ? f : '']"
              @click="filter = f"
            >
              {{ f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) }}
              <span v-if="f === 'error' && errorCount > 0" class="filter-count">{{ errorCount }}</span>
              <span v-if="f === 'warn' && warnCount > 0" class="filter-count">{{ warnCount }}</span>
            </button>
          </div>
        </div>
        <div ref="consoleRef" class="console-messages">
          <div v-if="filtered.length === 0" class="playground-console-empty">
            {{ consoleMessages.length === 0 ? 'No console output' : `No ${filter} messages` }}
          </div>
          <div
            v-for="(msg, i) in filtered"
            v-else
            :key="`${i}-${msg.timestamp}-${msg.type}`"
            class="console-row" :class="[msg.type]"
          >
            <span class="console-row-icon" :aria-label="msg.type">
              <svg v-if="msg.type === 'error'" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="5.5" fill="#f44336" />
                <path d="M4 4l4 4M8 4l-4 4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              <svg v-else-if="msg.type === 'warn'" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1L11.2 10H.8L6 1z" fill="#f9a825" />
                <path d="M6 4.5v2.5M6 8.5v.5" stroke="#1a1a1a" stroke-width="1.3" stroke-linecap="round" />
              </svg>
              <svg v-else-if="msg.type === 'info'" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="5.5" fill="#1976d2" />
                <path d="M6 5v4M6 3.5v.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 4h8M2 6h6M2 8h7" stroke="#9e9e9e" stroke-width="1.3" stroke-linecap="round" />
              </svg>
            </span>
            <span class="console-row-text">{{ msg.text }}</span>
            <span class="console-row-time">{{ formatTime(msg.timestamp) }}</span>
          </div>
        </div>
      </div>

      <div class="playground-panel-terminal" :class="[activeTab === 'terminal' ? 'active' : '']">
        <Terminal :messages="terminalMessages" />
      </div>
    </div>
  </div>
</template>

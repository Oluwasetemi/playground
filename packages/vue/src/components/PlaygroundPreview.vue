<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlaygroundContext } from '../context/PlaygroundContext'

withDefaults(defineProps<{ title?: string }>(), { title: 'Preview' })

const { engine, previewUrl, status } = usePlaygroundContext()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const inputUrl = ref('')
const iframeLoading = ref(false)
const lastUrl = ref<string | null>(null)
const lastEngine = ref(engine.value)

// .value required in <script> for ref access; templates auto-unwrap
const isReady = computed(() => status.value === 'ready' && !!previewUrl.value)

watch(previewUrl, (url) => {
  if (url) {
    inputUrl.value = url
    iframeLoading.value = true
  }
})

watch([engine, previewUrl], ([eng, url]) => {
  const shouldMount = iframeRef.value && eng && url
    && (url !== lastUrl.value || eng !== lastEngine.value)
  if (shouldMount && iframeRef.value) {
    eng!.mountPreview(iframeRef.value)
    lastUrl.value = url!
    lastEngine.value = eng
  }
}, { flush: 'post' })

function handleSubmit() {
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
</script>

<template>
  <div class="playground-preview">
    <div class="preview-toolbar">
      <span class="preview-title">{{ title }}</span>

      <form class="preview-url-form" @submit.prevent="handleSubmit">
        <div class="preview-url-bar">
          <span v-if="iframeLoading && isReady" class="preview-spinner" aria-hidden="true" />
          <span v-else class="preview-dot" :data-ready="isReady" aria-hidden="true" />
          <input
            v-model="inputUrl"
            type="text"
            class="preview-url-input"
            :disabled="!isReady"
            spellcheck="false"
            aria-label="Preview URL"
            placeholder="Waiting for server…"
          >
        </div>
      </form>

      <button type="button" class="preview-icon-btn" :disabled="!isReady" title="Refresh preview" aria-label="Refresh preview" @click="handleRefresh">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>

      <button type="button" class="preview-icon-btn" :disabled="!isReady" title="Open in new tab" aria-label="Open in new tab" @click="openNewTab">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </button>
    </div>

    <div class="preview-frame-area">
      <div v-if="status !== 'ready'" class="loading">
        <template v-if="status === 'initializing'">
          Initializing…
        </template>
        <template v-else-if="status === 'installing'">
          Installing dependencies…
        </template>
        <template v-else-if="status === 'error'">
          Error loading preview
        </template>
      </div>
      <iframe
        ref="iframeRef"
        :title="title"
        :style="{ display: previewUrl ? 'block' : 'none' }"
        @load="iframeLoading = false"
      />
    </div>
  </div>
</template>

<template>
  <div class="playground-editor">
    <div ref="containerRef" class="editor-container" />
    <div
      v-if="isSwitching"
      class="editor-switching-overlay"
      :aria-label="switchingLabel"
      aria-live="polite"
    >
      <div class="editor-switching-card">
        <span class="editor-switching-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7M15 11V7" />
          </svg>
        </span>
        <span class="editor-switching-label">{{ switchingLabel }}</span>
        <span class="editor-switching-dots"><span /><span /><span /></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlaygroundContext } from '../context/PlaygroundContext'

const { engine, status, template } = usePlaygroundContext()
const containerRef = ref<HTMLDivElement | null>(null)
const mounted = ref(false)

watch(status, (next, prev) => {
  if (prev === 'ready' && next !== 'ready') mounted.value = false
})

watch(engine, () => { mounted.value = false })

watch(
  [containerRef, engine, status],
  ([container, eng, s]) => {
    if (container && eng && s === 'ready' && !mounted.value) {
      mounted.value = true
      eng.mountEditor(container).catch((err: Error) => {
        console.error('Failed to mount editor:', err)
        mounted.value = false
      })
    }
  },
  { flush: 'post' },
)

// In templates, refs are auto-unwrapped — no .value needed in <template> blocks
const isSwitching = computed(() => status.value === 'initializing' || status.value === 'installing')

const switchingLabel = computed(() =>
  status.value === 'installing'
    ? `Installing ${template.value?.name ?? ''} dependencies…`
    : `Switching to ${template.value?.name ?? ''}…`,
)
</script>

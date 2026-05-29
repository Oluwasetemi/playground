<template>
  <div
    ref="containerRef"
    :class="['resizable-panel', className]"
    :style="containerStyle"
    :data-direction="effectiveDirection"
    :data-dragging="isDragging"
  >
    <div :class="['resizable-panel-first', firstPanelClassName]" :style="firstPanelStyle">
      <slot name="first" />
    </div>
    <div
      :class="['resizable-panel-resizer', resizerClassName]"
      :style="resizerStyle"
      role="separator"
      :aria-orientation="isHorizontal ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(size)"
      :aria-valuemin="minSize"
      :aria-valuemax="maxSize"
      tabindex="0"
      @mousedown="handleMouseDown"
      @touchstart="handleTouchStart"
    >
      <div class="resizable-panel-resizer-line" />
    </div>
    <div :class="['resizable-panel-second', secondPanelClassName]" :style="secondPanelStyle">
      <slot name="second" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  direction?: 'horizontal' | 'vertical'
  responsive?: boolean
  responsiveBreakpoint?: number
  initialSize?: number
  mobileInitialSize?: number
  minSize?: number
  maxSize?: number
  storageKey?: string
  className?: string
  firstPanelClassName?: string
  secondPanelClassName?: string
  resizerClassName?: string
}>(), {
  direction: 'horizontal',
  responsive: false,
  responsiveBreakpoint: 768,
  initialSize: 50,
  mobileInitialSize: 40,
  minSize: 10,
  maxSize: 90,
  className: '',
  firstPanelClassName: '',
  secondPanelClassName: '',
  resizerClassName: '',
})

const emit = defineEmits<{
  (e: 'resize-start'): void
  (e: 'resize', size: number): void
  (e: 'resize-end', size: number): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= props.responsiveBreakpoint : false)

function clamp(v: number) {
  return Math.min(props.maxSize, Math.max(props.minSize, v))
}

const effectiveDirection = computed(() =>
  props.responsive && isMobile.value ? 'vertical' : props.direction,
)

const isHorizontal = computed(() => effectiveDirection.value === 'horizontal')

const effectiveStorageKey = computed(() =>
  props.storageKey ? `${props.storageKey}${props.responsive && isMobile.value ? '-mobile' : ''}` : undefined,
)

function readStored(key: string | undefined, fallback: number): number {
  if (!key || typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    if (v) {
      const n = Number.parseFloat(v)
      if (!Number.isNaN(n) && n >= props.minSize && n <= props.maxSize) return n
    }
  }
  catch { /* sandboxed */ }
  return fallback
}

const size = ref(readStored(
  props.storageKey ? `${props.storageKey}${isMobile.value ? '-mobile' : ''}` : undefined,
  isMobile.value ? props.mobileInitialSize : props.initialSize,
))

// Sync size when orientation switches
watch(isMobile, () => {
  size.value = readStored(
    effectiveStorageKey.value,
    isMobile.value ? props.mobileInitialSize : props.initialSize,
  )
})

// Handle window resize for responsive mode
let resizeHandler: (() => void) | null = null
if (typeof window !== 'undefined') {
  resizeHandler = () => {
    isMobile.value = window.innerWidth <= props.responsiveBreakpoint
  }
  window.addEventListener('resize', resizeHandler)
  onUnmounted(() => { if (resizeHandler) window.removeEventListener('resize', resizeHandler) })
}

// Drag state
let dragStart: { position: number; size: number } | null = null

function handleMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
  dragStart = { position: isHorizontal.value ? e.clientX : e.clientY, size: size.value }
  emit('resize-start')
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onEnd)
}

function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  isDragging.value = true
  dragStart = { position: isHorizontal.value ? touch.clientX : touch.clientY, size: size.value }
  emit('resize-start')
  document.addEventListener('touchmove', onTouchMove)
  document.addEventListener('touchend', onEnd)
}

function onMouseMove(e: MouseEvent) {
  if (!containerRef.value || !dragStart) return
  const rect = containerRef.value.getBoundingClientRect()
  const containerSize = isHorizontal.value ? rect.width : rect.height
  const delta = (isHorizontal.value ? e.clientX : e.clientY) - dragStart.position
  const newSize = clamp(dragStart.size + (delta / containerSize) * 100)
  size.value = newSize
  emit('resize', newSize)
}

function onTouchMove(e: TouchEvent) {
  if (!containerRef.value || !dragStart) return
  const touch = e.touches[0]
  const rect = containerRef.value.getBoundingClientRect()
  const containerSize = isHorizontal.value ? rect.width : rect.height
  const delta = (isHorizontal.value ? touch.clientX : touch.clientY) - dragStart.position
  const newSize = clamp(dragStart.size + (delta / containerSize) * 100)
  size.value = newSize
  emit('resize', newSize)
}

function onEnd() {
  isDragging.value = false
  dragStart = null
  const finalSize = size.value
  if (effectiveStorageKey.value) {
    try { localStorage.setItem(effectiveStorageKey.value, finalSize.toString()) }
    catch { /* sandboxed */ }
  }
  emit('resize-end', finalSize)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onEnd)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onEnd)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onEnd)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onEnd)
})

const containerStyle = computed<CSSProperties>(() => ({
  display: 'flex',
  flexDirection: isHorizontal.value ? 'row' : 'column',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
}))

const firstPanelStyle = computed<CSSProperties>(() => ({
  [isHorizontal.value ? 'width' : 'height']: `${size.value}%`,
  flexShrink: 0,
  overflow: 'hidden',
}))

const secondPanelStyle = computed<CSSProperties>(() => ({
  flex: 1,
  overflow: 'hidden',
}))

const resizerStyle = computed<CSSProperties>(() => ({
  [isHorizontal.value ? 'width' : 'height']: '8px',
  cursor: isHorizontal.value ? 'col-resize' : 'row-resize',
  background: 'transparent',
  position: 'relative',
  flexShrink: 0,
  zIndex: 10,
}))
</script>

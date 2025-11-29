import type { FileNode, PlaygroundStatus, Template } from '../engine/types'
import { atom, computed, map } from 'nanostores'

/**
 * Boot state tracking (inspired by TutorialKit)
 * States: unknown -> blocked (iOS) | booting -> booted
 */
export type BootStatus = 'unknown' | 'blocked' | 'booting' | 'booted'

// Core state atoms
export const $bootStatus = atom<BootStatus>('unknown')
export const $playgroundStatus = atom<PlaygroundStatus>('initializing')
export const $currentTemplate = atom<Template | null>(null)
export const $files = atom<FileNode[]>([])
export const $previewUrl = atom<string | null>(null)
export const $activeFile = atom<string>('')
export const $openTabs = atom<string[]>([])
export const $error = atom<Error | null>(null)

// File content cache (path -> content)
export const $fileContents = map<Record<string, string>>({})

// Computed/derived state
export const $isReady = computed(
  [$playgroundStatus],
  status => status === 'ready',
)

export const $isLoading = computed(
  [$playgroundStatus],
  status => status === 'initializing' || status === 'installing',
)

export const $hasError = computed(
  [$error],
  error => error !== null,
)

// Platform support detection (TutorialKit pattern for iOS/iPadOS blocking)
export const $isPlatformSupported = atom<boolean>(true)

/**
 * Check if platform supports WebContainers
 * iOS and iPadOS are not supported
 */
export function checkPlatformSupport(): void {
  if (typeof navigator !== 'undefined') {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isIPadOS = navigator.userAgent.includes('Mac') && 'ontouchend' in document

    const supported = !isIOS && !isIPadOS
    $isPlatformSupported.set(supported)

    if (!supported) {
      $bootStatus.set('blocked')
      $error.set(new Error('WebContainers are not supported on iOS or iPadOS'))
    }
  }
}

// Initialize platform check on import
if (typeof window !== 'undefined') {
  checkPlatformSupport()
}

import type { FileNode, PlaygroundStatus, Template } from '../engine/types'
import type { BootStatus } from './stores'
import {
  $activeFile,
  $bootStatus,
  $currentTemplate,
  $error,
  $fileContents,
  $files,
  $openTabs,
  $playgroundStatus,
  $previewUrl,

} from './stores'

/**
 * Centralized actions for state updates
 * Follows TutorialKit's action pattern
 */
export const playgroundActions = {
  // Boot management
  setBootStatus(status: BootStatus): void {
    $bootStatus.set(status)
  },

  // Playground status
  setStatus(status: PlaygroundStatus): void {
    $playgroundStatus.set(status)
  },

  // Template management
  setTemplate(template: Template | null): void {
    $currentTemplate.set(template)
  },

  // File tree
  setFiles(files: FileNode[]): void {
    $files.set(files)
  },

  // Preview
  setPreviewUrl(url: string | null): void {
    $previewUrl.set(url)
  },

  // Editor state
  setActiveFile(path: string): void {
    $activeFile.set(path)
  },

  setOpenTabs(tabs: string[]): void {
    $openTabs.set(tabs)
  },

  addOpenTab(path: string): void {
    const current = $openTabs.get()
    if (!current.includes(path)) {
      $openTabs.set([...current, path])
    }
  },

  removeOpenTab(path: string): void {
    const current = $openTabs.get()
    $openTabs.set(current.filter(tab => tab !== path))
  },

  // File content cache
  updateFileContent(path: string, content: string): void {
    $fileContents.setKey(path, content)
  },

  removeFileContent(path: string): void {
    const current = $fileContents.get()
    delete current[path]
    $fileContents.set({ ...current })
  },

  clearFileContents(): void {
    $fileContents.set({})
  },

  // Error handling
  setError(error: Error | null): void {
    $error.set(error)
  },

  clearError(): void {
    $error.set(null)
  },

  // Batch reset (for cleanup)
  reset(): void {
    $playgroundStatus.set('initializing')
    $currentTemplate.set(null)
    $files.set([])
    $previewUrl.set(null)
    $activeFile.set('')
    $openTabs.set([])
    $error.set(null)
    $fileContents.set({})
  },
}

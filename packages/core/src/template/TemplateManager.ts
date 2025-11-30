import type { FileSystemTree, WebContainer } from '@webcontainer/api'
import type { Template } from '../engine/types'

export interface FileDiff {
  added: string[]
  removed: string[]
  modified: string[]
}

/**
 * Manages template switching with minimal filesystem disruption
 * Inspired by TutorialKit's lesson switching mechanism
 */
export class TemplateManager {
  private webcontainer: WebContainer
  private currentFiles: Map<string, string> = new Map()

  constructor(webcontainer: WebContainer) {
    this.webcontainer = webcontainer
  }

  /**
   * Compute file differences between current and target template
   */
  async computeDiff(targetTemplate: Template): Promise<FileDiff> {
    const targetFiles = this.flattenFileTree(targetTemplate.files)

    const added: string[] = []
    const removed: string[] = []
    const modified: string[] = []

    // Find added and modified files
    for (const [path, content] of targetFiles.entries()) {
      const current = this.currentFiles.get(path)
      if (!current) {
        added.push(path)
      }
      else if (current !== content) {
        modified.push(path)
      }
    }

    // Find removed files
    for (const path of this.currentFiles.keys()) {
      if (!targetFiles.has(path)) {
        removed.push(path)
      }
    }

    return { added, removed, modified }
  }

  /**
   * Apply incremental changes to filesystem
   */
  async applyDiff(diff: FileDiff, targetTemplate: Template): Promise<void> {
    const targetFiles = this.flattenFileTree(targetTemplate.files)

    // Step 1: Remove obsolete files
    for (const path of diff.removed) {
      try {
        await this.webcontainer.fs.rm(path, { force: true })
        this.currentFiles.delete(path)
        console.warn(`✓ Removed: ${path}`)
      }
      catch (error) {
        console.warn(`Failed to remove ${path}:`, error)
      }
    }

    // Step 1.5: Clean up empty directories
    await this.cleanupEmptyDirectories()

    // Step 2: Add/update files
    const filesToWrite = [...diff.added, ...diff.modified]
    for (const path of filesToWrite) {
      const content = targetFiles.get(path)
      if (content) {
        try {
          // Ensure parent directory exists
          const dirPath = path.substring(0, path.lastIndexOf('/'))
          if (dirPath && dirPath !== '/') {
            await this.webcontainer.fs.mkdir(dirPath, { recursive: true })
          }

          await this.webcontainer.fs.writeFile(path, content)
          this.currentFiles.set(path, content)
          console.warn(`✓ ${diff.added.includes(path) ? 'Added' : 'Modified'}: ${path}`)
        }
        catch (error) {
          console.warn(`Failed to write ${path}:`, error)
        }
      }
    }
  }

  /**
   * Check if dependencies changed between templates
   */
  dependenciesChanged(current: Template, target: Template): boolean {
    const currentDeps = JSON.stringify(current.dependencies) + JSON.stringify(current.devDependencies)
    const targetDeps = JSON.stringify(target.dependencies) + JSON.stringify(target.devDependencies)
    return currentDeps !== targetDeps
  }

  /**
   * Clean up empty directories after file removal
   * Recursively scans the filesystem and removes any empty directories
   */
  private async cleanupEmptyDirectories(): Promise<void> {
    try {
      await this.removeEmptyDirsRecursive('/')
    }
    catch (error) {
      console.warn('Failed to cleanup empty directories:', error)
    }
  }

  /**
   * Recursively remove empty directories
   */
  private async removeEmptyDirsRecursive(dirPath: string): Promise<boolean> {
    try {
      const entries = await this.webcontainer.fs.readdir(dirPath, { withFileTypes: true })

      // Skip node_modules and hidden directories
      const filteredEntries = entries.filter(
        entry => entry.name !== 'node_modules' && !entry.name.startsWith('.'),
      )

      if (filteredEntries.length === 0 && dirPath !== '/') {
        // Directory is empty, remove it
        await this.webcontainer.fs.rm(dirPath, { recursive: true, force: true })
        console.warn(`✓ Removed empty directory: ${dirPath}`)
        return true
      }

      // Recursively check subdirectories
      for (const entry of filteredEntries) {
        if (entry.isDirectory()) {
          const subDir = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`
          await this.removeEmptyDirsRecursive(subDir)
        }
      }

      // Check again after recursion - directory might now be empty
      const entriesAfter = await this.webcontainer.fs.readdir(dirPath, { withFileTypes: true })
      const filteredAfter = entriesAfter.filter(
        entry => entry.name !== 'node_modules' && !entry.name.startsWith('.'),
      )

      if (filteredAfter.length === 0 && dirPath !== '/') {
        await this.webcontainer.fs.rm(dirPath, { recursive: true, force: true })
        console.warn(`✓ Removed empty directory: ${dirPath}`)
        return true
      }

      return false
    }
    catch {
      return false
    }
  }

  /**
   * Flatten FileSystemTree to Map<path, content> for comparison
   */
  private flattenFileTree(tree: FileSystemTree, basePath: string = ''): Map<string, string> {
    const files = new Map<string, string>()

    for (const [name, node] of Object.entries(tree)) {
      const path = basePath ? `${basePath}/${name}` : name

      if ('file' in node && node.file && 'contents' in node.file) {
        const content = typeof node.file.contents === 'string'
          ? node.file.contents
          : new TextDecoder().decode(node.file.contents)
        files.set(`/${path}`, content)
      }
      else if ('directory' in node && node.directory) {
        const nested = this.flattenFileTree(node.directory, path)
        for (const [nestedPath, content] of nested.entries()) {
          files.set(nestedPath, content)
        }
      }
    }

    return files
  }

  /**
   * Update internal state after template mount/switch
   */
  updateCurrentState(template: Template): void {
    this.currentFiles = this.flattenFileTree(template.files)
  }

  /**
   * Get current file count for debugging
   */
  getCurrentFileCount(): number {
    return this.currentFiles.size
  }

  /**
   * Get set of expected file paths for a template
   * Used for validation after template switching
   */
  getExpectedPaths(template: Template): Set<string> {
    const files = this.flattenFileTree(template.files)
    return new Set(files.keys())
  }
}

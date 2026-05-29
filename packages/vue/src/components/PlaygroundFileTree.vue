<template>
  <div class="playground-file-tree">
    <div class="file-tree-header">
      Files
      <span v-if="isLoading" class="file-tree-spinner" aria-hidden="true" />
    </div>
    <div class="file-tree-content">
      <FileTreeSkeleton v-if="isLoading" />
      <FileTreeNode
        v-for="node in visibleFiles"
        v-else
        :key="node.path"
        :node="node"
        :hidden-files="hiddenFiles"
        @file-click="openFile"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileNode } from '@setemiojo/playground-core'
import { computed } from 'vue'
import { usePlaygroundContext } from '../context/PlaygroundContext'
import FileTreeNode from './FileTreeNode.vue'
import FileTreeSkeleton from './FileTreeSkeleton.vue'

const { files, openFile, status, hiddenFiles } = usePlaygroundContext()

const isLoading = computed(() => status.value === 'initializing' || status.value === 'installing')

function filterHidden(nodes: readonly FileNode[], hidden: string[]): FileNode[] {
  if (!hidden.length) return [...nodes]
  return nodes
    .filter(node => !hidden.some((h) => {
      const np = node.path.startsWith('/') ? node.path : `/${node.path}`
      const nh = h.startsWith('/') ? h : `/${h}`
      return np === nh
    }))
    .map(node =>
      node.type === 'directory' && node.children
        ? { ...node, children: filterHidden(node.children, hidden) }
        : { ...node },
    )
    .filter(node => node.type === 'file' || (node.children && node.children.length > 0))
}

// .value needed in <script> but not in <template> — Vue auto-unwraps refs in templates
const visibleFiles = computed(() => filterHidden(files.value as readonly FileNode[], hiddenFiles.value))
</script>

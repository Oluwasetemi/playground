<template>
  <div v-if="node.type === 'file'" class="file-node" @click="$emit('file-click', node.path)">
    <span class="file-icon">📄</span>
    <span class="file-name">{{ node.name }}</span>
  </div>
  <details v-else class="directory-node" open>
    <summary>
      <span class="folder-icon">📁</span>
      <span class="folder-name">{{ node.name }}</span>
    </summary>
    <div class="directory-children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :hidden-files="hiddenFiles"
        @file-click="$emit('file-click', $event)"
      />
    </div>
  </details>
</template>

<script setup lang="ts">
import type { FileNode } from '@setemiojo/playground-core'

defineProps<{ node: FileNode; hiddenFiles: string[] }>()
defineEmits<{ (e: 'file-click', path: string): void }>()
</script>

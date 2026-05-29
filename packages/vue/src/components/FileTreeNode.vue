<script setup lang="ts">
import type { FileNode } from '@setemiojo/playground-core'

defineProps<{ node: FileNode, hiddenFiles: string[] }>()
defineEmits<{ (e: 'fileClick', path: string): void }>()
</script>

<template>
  <div v-if="node.type === 'file'" class="file-node" @click="$emit('fileClick', node.path)">
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
        @file-click="$emit('fileClick', $event)"
      />
    </div>
  </details>
</template>

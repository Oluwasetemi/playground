<script setup lang="ts">
import { usePlaygroundContext } from '../context/PlaygroundContext'

const { saveSnapshot, status } = usePlaygroundContext()
</script>

<template>
  <div class="playground-toolbar">
    <button :disabled="status !== 'ready'" @click="saveSnapshot">
      Save
    </button>
    <div class="status-indicator" :data-status="status">
      <template v-if="status === 'ready'">
        ✓ Ready
      </template>
      <template v-else-if="status === 'initializing'">
        ⏳ Initializing...
      </template>
      <template v-else-if="status === 'installing'">
        📦 Installing...
      </template>
      <template v-else-if="status === 'error'">
        ❌ Error
      </template>
    </div>
  </div>
</template>

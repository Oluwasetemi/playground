<template>
  <div class="file-tree-skeleton" aria-label="Loading files…" aria-busy="true">
    <div
      v-for="(w, i) in widths"
      :key="i"
      class="file-tree-skeleton-row"
      :style="{ paddingLeft: i > 1 ? '22px' : '8px' }"
    >
      <div class="file-tree-skeleton-icon" />
      <div class="file-tree-skeleton-label" :style="{ width: w }" />
    </div>
  </div>
</template>

<script setup lang="ts">
const widths = ['60%', '45%', '72%', '38%', '55%', '65%', '42%']
</script>

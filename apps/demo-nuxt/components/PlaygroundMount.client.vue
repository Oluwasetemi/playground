<script setup lang="ts">
import type { Template } from '@setemiojo/playground-templates'
import {
  astroTemplate,
  honoTemplate,
  nextjsTemplate,
  nodeTemplate,
  reactEslintTemplate,
  reactTemplate,
  solidTemplate,
  svelteTemplate,
  vanillaTemplate,
  vueEslintTemplate,
  vueTemplate,
} from '@setemiojo/playground-templates'
import {
  Playground,
  PlaygroundEditor,
  PlaygroundFileTree,
  PlaygroundHeader,
  PlaygroundPanel,
  ResizablePanel,
} from '@setemiojo/playground-vue'
import { computed, ref } from 'vue'

const props = defineProps<{ templateKey: string, direction: 'horizontal' | 'vertical', editorType: 'codemirror' | 'monaco' }>()

const templateMap: Record<string, Template> = {
  'vanilla': vanillaTemplate,
  'react': reactTemplate,
  'react-eslint': reactEslintTemplate,
  'vue': vueTemplate,
  'vue-eslint': vueEslintTemplate,
  'solid': solidTemplate,
  'svelte': svelteTemplate,
  'astro': astroTemplate,
  'nextjs': nextjsTemplate,
  'node': nodeTemplate,
  'hono': honoTemplate,
}

const titles: Record<string, string> = {
  'vanilla': 'Vanilla Playground',
  'react': 'React Playground',
  'react-eslint': 'React + ESLint Playground',
  'vue': 'Vue Playground',
  'vue-eslint': 'Vue + ESLint Playground',
  'solid': 'SolidJS Playground',
  'svelte': 'Svelte Playground',
  'astro': 'Astro Playground',
  'nextjs': 'Next.js Playground',
  'node': 'Node.js Playground',
  'hono': 'Hono Playground',
}

const template = computed(() => templateMap[props.templateKey] ?? reactTemplate)
const title = computed(() => titles[props.templateKey] ?? 'Playground')
const options = computed(() => ({ autoSave: true, editor: props.editorType }))

const showSidebar = ref(false)
function toggleSidebar() {
  showSidebar.value = !showSidebar.value
}
</script>

<template>
  <Playground :template="template" :options="options" class="playground-mount">
    <div class="playground">
      <PlaygroundHeader
        :title="title"
        :on-toggle-sidebar="toggleSidebar"
        :show-sidebar="showSidebar"
      />
      <div class="playground-content">
        <aside v-if="showSidebar" class="playground-sidebar">
          <PlaygroundFileTree />
        </aside>
        <ResizablePanel
          :direction="direction"
          :responsive="true"
          :responsive-breakpoint="768"
          :initial-size="50"
          :mobile-initial-size="45"
          :min-size="20"
          :max-size="80"
          storage-key="nuxt-demo-panel-size"
          class="playground-main"
        >
          <template #first>
            <div class="playground-editor-section">
              <PlaygroundEditor />
            </div>
          </template>
          <template #second>
            <div class="playground-preview-section">
              <PlaygroundPanel />
            </div>
          </template>
        </ResizablePanel>
      </div>
    </div>
  </Playground>
</template>

<style scoped>
.playground-mount { width: 100%; height: 100%; }
</style>

<template>
  <div ref="mountEl" class="playground-mount" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  templateKey: string
  direction: 'horizontal' | 'vertical'
}>()

const mountEl = ref<HTMLElement | null>(null)

// React root kept outside of Vue reactivity to avoid proxy wrapping
let reactRoot: { unmount(): void } | null = null

const titles: Record<string, string> = {
  react: 'React Playground',
  'react-eslint': 'React + ESLint Playground',
  vue: 'Vue Playground',
  solid: 'SolidJS Playground',
  svelte: 'Svelte Playground',
  node: 'Node.js Playground',
  hono: 'Hono Playground',
}

async function mountPlayground(templateKey: string, direction: 'horizontal' | 'vertical') {
  if (!mountEl.value) return

  // Dynamically import React and playground packages — these are browser-only
  const [
    React,
    { createRoot },
    { createElement: h },
    {
      Playground,
      PlaygroundEditor,
      PlaygroundFileTree,
      PlaygroundHeader,
      PlaygroundPanel,
      ResizablePanel,
    },
    templates,
  ] = await Promise.all([
    import('react').then(m => m.default ?? m),
    import('react-dom/client'),
    import('react'),
    import('@setemiojo/playground-react'),
    import('@setemiojo/playground-templates'),
  ])

  const templateMap: Record<string, unknown> = {
    vanilla:      templates.vanillaTemplate,
    react:        templates.reactTemplate,
    'react-eslint': templates.reactEslintTemplate,
    vue:          templates.vueTemplate,
    solid:        templates.solidTemplate,
    svelte:       templates.svelteTemplate,
    node:         templates.nodeTemplate,
    hono:         templates.honoTemplate,
  }

  const template = templateMap[templateKey] ?? templates.reactTemplate

  // Unmount any existing React tree before creating a new one
  reactRoot?.unmount()

  reactRoot = createRoot(mountEl.value)

  // Build the playground tree using createElement to avoid JSX in a .vue file
  const tree = h(Playground, { template, options: { autoSave: true } },
    h('div', { className: 'playground' },
      h(PlaygroundHeader, {
        title: titles[templateKey] ?? 'Playground',
        onToggleSidebar: () => {
          // Sidebar toggle state is local to the React tree
          const el = mountEl.value?.querySelector('.playground-sidebar')
          if (el) (el as HTMLElement).style.display = (el as HTMLElement).style.display === 'none' ? '' : 'none'
        },
      }),
      h('div', { className: 'playground-content' },
        h(ResizablePanel, {
          firstPanel:  h('div', { className: 'playground-editor-section' }, h(PlaygroundEditor)),
          secondPanel: h('div', { className: 'playground-preview-section' }, h(PlaygroundPanel)),
          direction,
          responsive: true,
          responsiveBreakpoint: 768,
          initialSize: 50,
          mobileInitialSize: 45,
          minSize: 20,
          maxSize: 80,
          storageKey: 'nuxt-demo-panel-size',
          className: 'playground-main',
        }),
      ),
    ),
  )

  reactRoot.render(tree)
}

onMounted(() => {
  mountPlayground(props.templateKey, props.direction)
})

// Re-render when template or direction changes.
// Template switching is handled by the Playground component internally
// (diff-based, no WebContainer restart), so we just re-render the React tree.
watch(() => [props.templateKey, props.direction] as const, ([key, dir]) => {
  mountPlayground(key, dir)
})

onBeforeUnmount(() => {
  reactRoot?.unmount()
  reactRoot = null
})
</script>

<style scoped>
.playground-mount {
  width: 100%;
  height: 100%;
}
</style>

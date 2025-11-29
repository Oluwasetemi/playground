import type { Template } from './types'

export const vueTemplate: Template = {
  id: 'vue',
  name: 'Vue 3',
  description: 'Vue 3 with Vite',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'vue-playground',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build' },
          dependencies: { vue: '^3.3.0' },
          devDependencies: { '@vitejs/plugin-vue': '^4.4.0', 'vite': '^5.0.0' },
        }, null, 2),
      },
    },
    'vite.config.js': {
      file: {
        contents: `import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\n\nexport default defineConfig({ plugins: [vue()] });`,
      },
    },
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>\n<html>\n<head><title>Vue Playground</title></head>\n<body>\n<div id="app"></div>\n<script type="module" src="/src/main.js"></script>\n</body>\n</html>`,
      },
    },
    'src': {
      directory: {
        'main.js': {
          file: {
            contents: `import { createApp } from 'vue';\nimport App from './App.vue';\n\ncreateApp(App).mount('#app');`,
          },
        },
        'App.vue': {
          file: {
            contents: `<template>\n  <div class="app">\n    <h1>Vue Playground</h1>\n    <p>Count: {{ count }}</p>\n    <button @click="count++">Increment</button>\n  </div>\n</template>\n\n<script setup>\nimport { ref } from 'vue';\nconst count = ref(0);\n</script>\n\n<style scoped>\n.app { text-align: center; padding: 40px; }\nbutton { background: #42b983; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }\n</style>`,
          },
        },
      },
    },
  },
  dependencies: { 'vue': '^3.3.0', '@vitejs/plugin-vue': '^4.4.0', 'vite': '^5.0.0' },
  commands: { dev: 'npm run dev' },
  entryFile: '/src/App.vue',
}

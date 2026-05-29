import type { Template } from './types'
import { CONSOLE_FORWARDER_SCRIPT } from './console-forwarder'

export const vueEslintTemplate: Template = {
  id: 'vue-eslint',
  name: 'Vue + ESLint',
  description: 'Vue 3 with Vite 8 and @setemiojo/eslint-config',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify(
          {
            name: 'vue-eslint-playground',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              lint: 'eslint .',
            },
            dependencies: {
              vue: '^3.5.34',
            },
            devDependencies: {
              '@setemiojo/eslint-config': '^9.0.0',
              '@vitejs/plugin-vue': '^6.0.7',
              'eslint': '^10.4.0',
              'eslint-plugin-vue': '^9.33.0',
              'vite': '^8.0.13',
              'vue-eslint-parser': '^9.4.3',
            },
          },
          null,
          2,
        ),
      },
    },
    'vite.config.js': {
      file: {
        contents: `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});`,
      },
    },
    'eslint.config.js': {
      file: {
        contents: `import setemiojo from '@setemiojo/eslint-config';

export default setemiojo({
  vue: true,
});`,
      },
    },
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue + ESLint Playground</title>
    ${CONSOLE_FORWARDER_SCRIPT}
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`,
      },
    },
    'src': {
      directory: {
        'main.js': {
          file: {
            contents: `import { createApp } from 'vue';
import App from './App.vue';
import './index.css';

createApp(App).mount('#app');`,
          },
        },
        'App.vue': {
          file: {
            contents: `<template>
  <div class="app">
    <h1>Vue + ESLint Playground</h1>
    <p>Linting powered by <code>@setemiojo/eslint-config</code>.</p>
    <div class="card">
      <button @click="count++">
        Count is {{ count }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const count = ref(0);
</script>

<style scoped>
.app {
  text-align: center;
  padding: 40px;
}

h1 { color: #333; margin-bottom: 20px; }

.card { padding: 20px; }

button {
  background: #42b983;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover { opacity: 0.85; }
</style>`,
          },
        },
        'index.css': {
          file: {
            contents: `body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}`,
          },
        },
      },
    },
  },
  dependencies: {
    vue: '^3.5.34',
  },
  devDependencies: {
    '@setemiojo/eslint-config': '^9.0.0',
    '@vitejs/plugin-vue': '^6.0.7',
    'eslint': '^10.4.0',
    'eslint-plugin-vue': '^9.33.0',
    'vite': '^8.0.13',
    'vue-eslint-parser': '^9.4.3',
  },
  commands: { dev: 'npm run dev' },
  entryFile: '/src/App.vue',
  hiddenFiles: ['/vite.config.js', '/package.json'],
}

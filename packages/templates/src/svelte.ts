import type { Template } from './types'
import { CONSOLE_FORWARDER_SCRIPT } from './console-forwarder'

export const svelteTemplate: Template = {
  id: 'svelte',
  name: 'Svelte 5',
  description: 'Svelte 5 with Vite 8',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify(
          {
            name: 'svelte-playground',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
            },
            dependencies: {
              svelte: '^5.55.9',
            },
            devDependencies: {
              '@sveltejs/vite-plugin-svelte': '^7.1.2',
              'vite': '^8.0.13',
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
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
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
    <title>Svelte Playground</title>
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
            contents: `import { mount } from 'svelte';
import App from './App.svelte';
import './index.css';

mount(App, { target: document.getElementById('app') });`,
          },
        },
        'App.svelte': {
          file: {
            contents: `<script>
  let count = $state(0);
</script>

<div class="app">
  <h1>Svelte 5 Playground</h1>
  <p>Signals-based reactivity with runes.</p>
  <div class="card">
    <button onclick={() => count++}>
      Count is {count}
    </button>
  </div>
</div>

<style>
  .app {
    text-align: center;
    padding: 40px;
  }

  h1 { color: #333; margin-bottom: 20px; }

  .card { padding: 20px; }

  button {
    background: #ff3e00;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }

  button:hover { background: #cc3200; }
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
    svelte: '^5.55.9',
  },
  devDependencies: {
    '@sveltejs/vite-plugin-svelte': '^7.1.2',
    'vite': '^8.0.13',
  },
  commands: { dev: 'npm run dev' },
  entryFile: '/src/App.svelte',
  hiddenFiles: ['/vite.config.js', '/package.json'],
}

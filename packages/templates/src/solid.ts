import type { Template } from './types'
import { CONSOLE_FORWARDER_SCRIPT } from './console-forwarder'

export const solidTemplate: Template = {
  id: 'solid',
  name: 'SolidJS',
  description: 'SolidJS with Vite 8',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify(
          {
            name: 'solid-playground',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
            },
            dependencies: {
              'solid-js': '^1.9.13',
            },
            devDependencies: {
              'vite': '^8.0.13',
              'vite-plugin-solid': '^2.11.12',
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
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
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
    <title>SolidJS Playground</title>
    ${CONSOLE_FORWARDER_SCRIPT}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>`,
      },
    },
    'src': {
      directory: {
        'index.jsx': {
          file: {
            contents: `import { render } from 'solid-js/web';
import App from './App';
import './index.css';

render(() => <App />, document.getElementById('root'));`,
          },
        },
        'App.jsx': {
          file: {
            contents: `import { createSignal } from 'solid-js';
import './App.css';

export default function App() {
  const [count, setCount] = createSignal(0);

  return (
    <div class="App">
      <h1>SolidJS Playground</h1>
      <p>Fine-grained reactivity. No virtual DOM.</p>
      <div class="card">
        <button onClick={() => setCount(c => c + 1)}>
          Count is {count()}
        </button>
      </div>
    </div>
  );
}`,
          },
        },
        'App.css': {
          file: {
            contents: `.App {
  text-align: center;
  padding: 40px;
}

h1 { color: #333; margin-bottom: 20px; }

.card { padding: 20px; }

button {
  background: #2c4f7c;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover { background: #446b9e; }`,
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
    'solid-js': '^1.9.13',
  },
  devDependencies: {
    'vite': '^8.0.13',
    'vite-plugin-solid': '^2.11.12',
  },
  commands: { dev: 'npm run dev' },
  entryFile: '/src/App.jsx',
  hiddenFiles: ['/vite.config.js', '/package.json'],
}

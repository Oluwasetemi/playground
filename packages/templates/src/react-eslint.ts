import type { Template } from './types'
import { CONSOLE_FORWARDER_SCRIPT } from './console-forwarder'

export const reactEslintTemplate: Template = {
  id: 'react-eslint',
  name: 'React + ESLint',
  description: 'React 19 with Vite 8 and @setemiojo/eslint-config',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify(
          {
            name: 'react-eslint-playground',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              lint: 'eslint .',
            },
            dependencies: {
              'react': '^19.2.6',
              'react-dom': '^19.2.6',
            },
            devDependencies: {
              '@eslint-react/eslint-plugin': '^5.8.5',
              '@setemiojo/eslint-config': '^9.0.0',
              '@types/react': '^19.2.15',
              '@types/react-dom': '^19.2.3',
              '@vitejs/plugin-react': '^6.0.2',
              'eslint': '^10.4.0',
              'eslint-plugin-react-refresh': '^0.5.2',
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
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,
      },
    },
    'eslint.config.js': {
      file: {
        contents: `import setemiojo from '@setemiojo/eslint-config';

export default setemiojo({
  react: true,
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
    <title>React + ESLint Playground</title>
    ${CONSOLE_FORWARDER_SCRIPT}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
      },
    },
    'src': {
      directory: {
        'main.jsx': {
          file: {
            contents: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
          },
        },
        'App.jsx': {
          file: {
            contents: `import { useState } from 'react';
import './App.css';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>React + ESLint Playground</h1>
      <p>Linting powered by <code>@setemiojo/eslint-config</code>.</p>
      <div className="card">
        <button onClick={() => setCount(c => c + 1)}>
          Count is {count}
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
  background: #61dafb;
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover { opacity: 0.85; }`,
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
    'react': '^19.2.6',
    'react-dom': '^19.2.6',
  },
  devDependencies: {
    '@eslint-react/eslint-plugin': '^5.8.5',
    '@setemiojo/eslint-config': '^9.0.0',
    '@types/react': '^19.2.15',
    '@types/react-dom': '^19.2.3',
    '@vitejs/plugin-react': '^6.0.2',
    'eslint': '^10.4.0',
    'eslint-plugin-react-refresh': '^0.5.2',
    'vite': '^8.0.13',
  },
  commands: { dev: 'npm run dev' },
  entryFile: '/src/App.jsx',
  hiddenFiles: ['/vite.config.js', '/package.json'],
}

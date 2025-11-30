import type { Template } from './types'

export const reactTemplate: Template = {
  id: 'react',
  name: 'React',
  description: 'React 19 with Vite',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify(
          {
            name: 'react-playground',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
            },
            dependencies: {
              'react': '^19.2.0',
              'react-dom': '^19.2.0',
            },
            devDependencies: {
              '@types/react': '^19.2.7',
              '@types/react-dom': '^19.2.3',
              '@vitejs/plugin-react': '^5.0.0',
              'vite': '^7.0.0',
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
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Playground</title>
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

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>React Playground</h1>
      <p>Edit src/App.jsx to see changes instantly.</p>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          Count is {count}
        </button>
      </div>
    </div>
  );
}

export default App;`,
          },
        },
        'App.css': {
          file: {
            contents: `.App {
  text-align: center;
  padding: 40px;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.card {
  padding: 20px;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background: #0056b3;
}`,
          },
        },
        'index.css': {
          file: {
            contents: `body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,
          },
        },
      },
    },
  },
  dependencies: {
    'react': '^19.2.0',
    'react-dom': '^19.2.0',
  },
  devDependencies: {
    '@types/react': '^19.2.7',
    '@types/react-dom': '^19.2.3',
    '@vitejs/plugin-react': '^5.0.0',
    'vite': '^7.0.0',
  },
  commands: {
    dev: 'npm run dev',
  },
  entryFile: '/src/App.jsx',
}

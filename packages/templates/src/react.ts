import type { Template } from './types'
import { CONSOLE_FORWARDER_SCRIPT } from './console-forwarder'

export const reactTemplate: Template = {
  id: 'react',
  name: 'React',
  description: 'React 19 with Vite 8',
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
              'react': '^19.2.6',
              'react-dom': '^19.2.6',
            },
            devDependencies: {
              '@types/react': '^19.2.15',
              '@types/react-dom': '^19.2.3',
              '@vitejs/plugin-react': '^6.0.2',
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
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Playground</title>
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
            contents: `import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('React Playground ready!');
  }, []);

  const handleClick = () => {
    const next = count + 1;
    setCount(next);
    console.log('Count updated:', next);
  };

  return (
    <div className="App">
      <h1>React Playground</h1>
      <p>Edit src/App.jsx to see changes instantly.</p>

      <div className="card">
        <button onClick={handleClick}>
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
    'react': '^19.2.6',
    'react-dom': '^19.2.6',
  },
  devDependencies: {
    '@types/react': '^19.2.15',
    '@types/react-dom': '^19.2.3',
    '@vitejs/plugin-react': '^6.0.2',
    'vite': '^8.0.13',
  },
  commands: {
    dev: 'npm run dev',
  },
  entryFile: '/src/App.jsx',
  // Example: hide config files from the file tree
  hiddenFiles: ['/vite.config.js', '/package.json'],
}

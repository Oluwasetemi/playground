import type { Template } from './types'

export const vanillaTemplate: Template = {
  id: 'vanilla-js',
  name: 'Vanilla JavaScript',
  description: 'Plain JavaScript with Vite',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify(
          {
            name: 'vanilla-playground',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
            },
            devDependencies: {
              vite: '^7.0.0',
            },
          },
          null,
          2,
        ),
      },
    },
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vanilla Playground</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`,
      },
    },
    'main.js': {
      file: {
        contents: `import './style.css';

const app = document.getElementById('app');

app.innerHTML = \`
  <h1>Hello from Playground!</h1>
  <p>Edit main.js to see changes instantly.</p>
  <button id="clickMe">Click me!</button>
\`;

document.getElementById('clickMe').addEventListener('click', () => {
  console.log('Button clicked!');
  alert('Hello from the playground!');
});`,
      },
    },
    'style.css': {
      file: {
        contents: `body {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  line-height: 1.6;
}

h1 {
  color: #333;
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
  },
  dependencies: {},
  devDependencies: {
    vite: '^5.0.0',
  },
  commands: {
    dev: 'npm run dev',
  },
  entryFile: '/main.js',
}

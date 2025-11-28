import type { Template } from './types';

export const nodeTemplate: Template = {
  id: 'node',
  name: 'Node.js',
  description: 'Node.js with Express',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'node-playground',
          type: 'module',
          scripts: { dev: 'node server.js' },
          dependencies: { express: '^4.18.2' },
        }, null, 2),
      },
    },
    'server.js': {
      file: {
        contents: `import express from 'express';\n\nconst app = express();\nconst PORT = 3000;\n\napp.get('/', (req, res) => {\n  res.send('<h1>Hello from Node.js!</h1><p>Edit server.js to see changes.</p>');\n});\n\napp.get('/api/data', (req, res) => {\n  res.json({ message: 'API is working!', timestamp: new Date() });\n});\n\napp.listen(PORT, () => {\n  console.log(\`Server running at http://localhost:\${PORT}\`);\n});`,
      },
    },
  },
  dependencies: { express: '^4.18.2' },
  commands: { dev: 'npm run dev' },
  entryFile: '/server.js',
};

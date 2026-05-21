import type { Template } from './types'

export const honoTemplate: Template = {
  id: 'hono',
  name: 'Hono',
  description: 'Hono web framework on Node.js',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'hono-playground',
          type: 'module',
          scripts: { dev: 'node --watch server.js' },
          dependencies: { hono: '^4.12.21', '@hono/node-server': '^2.0.3' },
        }, null, 2),
      },
    },
    'server.js': {
      file: {
        contents: `import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => {
  return c.html(\`
    <!DOCTYPE html>
    <html>
      <head><title>Hono Playground</title></head>
      <body>
        <h1>Hello from Hono!</h1>
        <p>Edit server.js to see changes.</p>
      </body>
    </html>
  \`);
});

app.get('/api/data', (c) => {
  return c.json({
    message: 'API is working!',
    framework: 'Hono',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/hello/:name', (c) => {
  const name = c.req.param('name');
  return c.json({ message: \`Hello, \${name}!\` });
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(\`Hono server running at http://localhost:\${info.port}\`);
});
`,
      },
    },
  },
  dependencies: {
    hono: '^4.12.21',
    '@hono/node-server': '^2.0.3',
  },
  devDependencies: {},
  commands: { dev: 'npm run dev' },
  entryFile: '/server.js',
}

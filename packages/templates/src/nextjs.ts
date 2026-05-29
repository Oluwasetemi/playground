import type { Template } from './types'

export const nextjsTemplate: Template = {
  id: 'nextjs',
  name: 'Next.js',
  description: 'Next.js 16 with App Router',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify(
          {
            name: 'nextjs-playground',
            scripts: {
              dev: 'next dev --webpack',
              build: 'next build',
            },
            dependencies: {
              'next': '^16.2.6',
              'react': '^19.2.6',
              'react-dom': '^19.2.6',
            },
          },
          null,
          2,
        ),
      },
    },
    'next.config.mjs': {
      file: {
        contents: `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
`,
      },
    },
    'src': {
      directory: {
        app: {
          directory: {
            'globals.css': {
              file: {
                contents: `*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #0a0a0a;
  color: #ededed;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

main {
  max-width: 540px;
  width: 100%;
  padding: 2.5rem;
  background: #111;
  border-radius: 12px;
  border: 1px solid #222;
}

h1 {
  margin: 0 0 0.25rem;
  font-size: 1.8rem;
  letter-spacing: -0.02em;
}

.badge {
  display: inline-block;
  background: #0070f3;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
}

.card {
  margin-top: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
}

p { margin: 0.25rem 0; color: #999; font-size: 0.95rem; }
p strong { color: #ededed; font-size: 1.1rem; }

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

button {
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.15s;
}
button:hover { opacity: 0.85; }

.btn-inc { background: #0070f3; color: #fff; }
.btn-dec { background: #222; color: #ededed; border: 1px solid #333; }
`,
              },
            },
            'layout.jsx': {
              file: {
                contents: `import './globals.css';

export const metadata = {
  title: 'Next.js Playground',
  description: 'Next.js App Router demo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
              },
            },
            'page.jsx': {
              file: {
                contents: `'use client';

import { useState } from 'react';

export default function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <h1>Next.js Playground</h1>
      <span className="badge">App Router</span>

      <div className="card">
        <p>Server Components by default.</p>
        <p>Mark a file <code>'use client'</code> to add interactivity.</p>
        <p>
          Count: <strong>{count}</strong>
        </p>
        <div className="actions">
          <button className="btn-dec" onClick={() => setCount(c => Math.max(0, c - 1))}>
            Decrement
          </button>
          <button className="btn-inc" onClick={() => setCount(c => c + 1)}>
            Increment
          </button>
        </div>
      </div>
    </main>
  );
}
`,
              },
            },
          },
        },
      },
    },
  },
  dependencies: {
    'next': '^16.2.6',
    'react': '^19.2.6',
    'react-dom': '^19.2.6',
  },
  devDependencies: {},
  commands: { dev: 'npm run dev' }, // npm run dev → next dev --webpack (Turbopack needs native binaries unavailable in WebContainer)
  entryFile: '/src/app/page.jsx',
  hiddenFiles: ['/next.config.mjs', '/package.json'],
}

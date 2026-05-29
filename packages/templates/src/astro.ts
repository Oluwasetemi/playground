import type { Template } from './types'

export const astroTemplate: Template = {
  id: 'astro',
  name: 'Astro',
  description: 'Astro 6 with islands architecture',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify(
          {
            name: 'astro-playground',
            scripts: {
              dev: 'astro dev',
              build: 'astro build',
            },
            dependencies: {
              astro: '^6.3.7',
            },
          },
          null,
          2,
        ),
      },
    },
    'astro.config.mjs': {
      file: {
        contents: `import { defineConfig } from 'astro/config';

export default defineConfig({});
`,
      },
    },
    'src': {
      directory: {
        components: {
          directory: {
            'Counter.astro': {
              file: {
                contents: `---
// Astro components run at build time by default.
// <script> blocks are shipped to the browser as islands.
const { label = 'Count' } = Astro.props;
---

<div class="counter">
  <p class="label">{label}: <strong id="val">0</strong></p>
  <button id="dec">−</button>
  <button id="inc">+</button>
</div>

<script>
  const val = document.getElementById('val');
  document.getElementById('inc').addEventListener('click', () => {
    val.textContent = String(Number(val.textContent) + 1);
  });
  document.getElementById('dec').addEventListener('click', () => {
    val.textContent = String(Math.max(0, Number(val.textContent) - 1));
  });
</script>

<style>
  .counter { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .label { margin: 0; }
  button {
    background: #FF5D01;
    color: #fff;
    border: none;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    font-size: 1.1rem;
    cursor: pointer;
    line-height: 1;
  }
  button:hover { opacity: 0.85; }
</style>
`,
              },
            },
          },
        },
        pages: {
          directory: {
            'index.astro': {
              file: {
                contents: `---
import Counter from '../components/Counter.astro';

const title = 'Astro Playground';
const features = [
  'Zero JS by default — ship only what you need',
  'Islands architecture — hydrate components independently',
  'Framework-agnostic — use React, Vue, Svelte, and more',
  'Content-first — built for fast, content-rich sites',
];
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: system-ui, -apple-system, sans-serif;
        background: #13151a;
        color: #e8eaf6;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card {
        max-width: 560px;
        width: 100%;
        padding: 2.5rem;
        background: #1a1d2e;
        border-radius: 12px;
        border: 1px solid #2a2d3e;
      }
      h1 { margin: 0 0 0.25rem; font-size: 1.8rem; }
      .badge {
        display: inline-block;
        background: #FF5D01;
        color: #fff;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        margin-bottom: 1.5rem;
        text-transform: uppercase;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      li::before { content: '✦ '; color: #FF5D01; }
      .divider { border: none; border-top: 1px solid #2a2d3e; margin: 1.5rem 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>{title}</h1>
      <span class="badge">Astro v6</span>

      <ul>
        {features.map(f => <li>{f}</li>)}
      </ul>

      <hr class="divider" />

      <!-- Counter is an Astro component with a client-side script island -->
      <Counter label="Clicks" />
    </div>
  </body>
</html>
`,
              },
            },
          },
        },
      },
    },
  },
  dependencies: {
    astro: '^6.3.7',
  },
  devDependencies: {},
  commands: { dev: 'npm run dev' },
  entryFile: '/src/pages/index.astro',
  hiddenFiles: ['/astro.config.mjs', '/package.json'],
}

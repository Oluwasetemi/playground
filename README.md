# @setemiojo/playground

A full-featured, in-browser code playground powered by [WebContainers](https://webcontainers.io/). Run real Node.js, install npm packages, and preview live output — all inside a browser tab, no server required.

**[Live Demo →](https://playground-demo-five.vercel.app)**

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@setemiojo/playground-core`](#core) | [![npm](https://img.shields.io/npm/v/@setemiojo/playground-core)](https://www.npmjs.com/package/@setemiojo/playground-core) | Framework-agnostic engine |
| [`@setemiojo/playground-react`](#react) | [![npm](https://img.shields.io/npm/v/@setemiojo/playground-react)](https://www.npmjs.com/package/@setemiojo/playground-react) | React components and hooks |
| [`@setemiojo/playground-templates`](#templates) | [![npm](https://img.shields.io/npm/v/@setemiojo/playground-templates)](https://www.npmjs.com/package/@setemiojo/playground-templates) | Built-in project templates |

---

## Requirements

- Node.js ≥ 18
- The host page **must** serve these HTTP headers (WebContainers requirement):
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
  See the [host page setup](#host-page-setup) section below.
- Not supported on iOS/iPadOS (WebContainers limitation).

---

## Quick start

```bash
npm install @setemiojo/playground-react @setemiojo/playground-core @setemiojo/playground-templates
```

```tsx
import {
  Playground,
  PlaygroundEditor,
  PlaygroundPanel,
  ResizablePanel,
} from '@setemiojo/playground-react'
import { reactTemplate } from '@setemiojo/playground-templates'
import '@setemiojo/playground-react/styles'

export default function App() {
  return (
    <Playground template={reactTemplate} options={{ autoSave: true }}>
      <ResizablePanel
        firstPanel={<PlaygroundEditor />}
        secondPanel={<PlaygroundPanel />}
        direction="horizontal"
        initialSize={50}
      />
    </Playground>
  )
}
```

---

## React package — `@setemiojo/playground-react` {#react}

### Installation

```bash
npm install @setemiojo/playground-react @setemiojo/playground-core
# peer deps
npm install react react-dom
```

Import the stylesheet once at your app root:

```ts
import '@setemiojo/playground-react/styles'
```

---

### `<Playground>`

Root provider. Boots the WebContainer, mounts the engine, and exposes all state to child components via context.

```tsx
import { Playground } from '@setemiojo/playground-react'

<Playground
  template={reactTemplate}   // required
  options={{                 // optional — see PlaygroundOptions below
    editor: 'codemirror',
    autoSave: true,
    autoSaveInterval: 2000,
    theme: 'dark',
    showLineNumbers: true,
    editorOptions: {
      fontSize: 14,
      tabSize: 2,
      wordWrap: 'on',
      minimap: false,        // Monaco only
    },
  }}
>
  {/* any combination of playground components */}
</Playground>
```

**Props**

| Prop | Type | Required | Description |
|---|---|---|---|
| `template` | `Template` | Yes | The project template to load |
| `options` | `PlaygroundOptions` | No | Editor, persistence, and display settings |
| `children` | `ReactNode` | No | Components that consume playground context |

**Switching templates at runtime** — update the `template` prop. The engine diffs the new and old file trees and writes only the changed files; the WebContainer is never restarted.

**Switching editors at runtime** — pass `editor: editorType` as a state variable. The engine hot-swaps the adapter without restarting the WebContainer or interrupting in-flight installs.

---

### `PlaygroundOptions`

```ts
interface PlaygroundOptions {
  theme?: 'light' | 'dark'
  autoSave?: boolean           // persist edits to localStorage (default: false)
  autoSaveInterval?: number    // ms between auto-saves (default: 2000)
  showLineNumbers?: boolean    // (default: true)
  editor?: 'codemirror' | 'monaco'  // (default: 'codemirror')
  editorOptions?: {
    fontSize?: number
    fontFamily?: string
    tabSize?: number
    wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
    minimap?: boolean          // Monaco only
  }
}
```

---

### Components

#### `<PlaygroundEditor>`

Mounts the code editor (CodeMirror 6 or Monaco) and handles file opens, language detection, and formatting. No props required — reads everything from context.

```tsx
<PlaygroundEditor />
```

---

#### `<PlaygroundPanel>`

Tabbed output panel with three tabs:

- **Result** — live iframe preview with a URL bar (editable address, refresh and open-in-new-tab buttons)
- **Console** — captures `console.log / warn / error / info` from the preview iframe, with filter buttons
- **Terminal** — full ANSI xterm.js terminal showing process stdout/stderr from the dev server

```tsx
<PlaygroundPanel defaultTab="result" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultTab` | `'result' \| 'console' \| 'terminal'` | `'result'` | Tab shown on first render |

---

#### `<PlaygroundFileTree>`

Renders the virtual filesystem as a clickable tree. Clicking a file opens it in the editor. Files listed in the template's `hiddenFiles` array are omitted.

```tsx
<PlaygroundFileTree />
```

---

#### `<PlaygroundHeader>`

Status indicator, title, and sidebar toggle button.

```tsx
<PlaygroundHeader
  title="React Playground"
  onToggleSidebar={() => setShowSidebar(s => !s)}
  showSidebar={showSidebar}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'Playground'` | Text shown in the header |
| `onToggleSidebar` | `() => void` | — | Called when the sidebar icon is clicked |
| `showSidebar` | `boolean` | — | Controls the active state of the sidebar icon |

---

#### `<PlaygroundPreview>`

Standalone iframe preview — the same iframe that appears inside `<PlaygroundPanel>`'s Result tab, but mounted as a standalone component with its own URL bar.

```tsx
<PlaygroundPreview title="Preview" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | `title` attribute on the iframe |

---

#### `<PlaygroundTerminal>`

Pre-wired terminal that reads `terminalMessages` from context and renders them via xterm.js. Use this inside a custom layout when you don't want the full `<PlaygroundPanel>`.

```tsx
<PlaygroundTerminal />
```

---

#### `<PlaygroundToolbar>`

Format, reset, and open-in-StackBlitz action buttons. Reads `formatCode`, `resetCode`, and `openInStackBlitz` from context.

```tsx
<PlaygroundToolbar />
```

---

#### `<Terminal>`

Standalone xterm.js terminal with full ANSI colour support and auto-fit on resize. Use this when you supply messages manually instead of from context.

```tsx
import { Terminal } from '@setemiojo/playground-react'

<Terminal
  messages={terminalMessages}
  theme={{ background: '#1e1e1e', foreground: '#d4d4d4' }}
  fontSize={13}
  fontFamily="Menlo, monospace"
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `messages` | `TerminalMessage[]` | `[]` | Messages to write (append-only, new items written incrementally) |
| `className` | `string` | `''` | Extra CSS class on the container |
| `theme` | `TerminalTheme` | VS Code Dark+ | xterm.js theme overrides |
| `fontFamily` | `string` | `'Menlo, Monaco, "Courier New", monospace'` | Font stack |
| `fontSize` | `number` | `13` | Font size in px |
| `lineHeight` | `number` | `1.4` | Line height |

```ts
interface TerminalMessage {
  type: 'stdout' | 'stderr'
  text: string
  timestamp: number
}
```

---

#### `<ResizablePanel>`

Drag-to-resize split pane. Persists the split ratio to `localStorage` and can automatically collapse to a vertical layout on small screens.

```tsx
<ResizablePanel
  firstPanel={<PlaygroundEditor />}
  secondPanel={<PlaygroundPanel />}
  direction="horizontal"
  responsive
  responsiveBreakpoint={768}
  initialSize={50}
  mobileInitialSize={40}
  minSize={20}
  maxSize={80}
  storageKey="my-playground-split"
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `firstPanel` | `ReactNode` | — | Left (or top) panel |
| `secondPanel` | `ReactNode` | — | Right (or bottom) panel |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | Split axis |
| `responsive` | `boolean` | `false` | Auto-switch to vertical below `responsiveBreakpoint` |
| `responsiveBreakpoint` | `number` | `768` | px width below which vertical layout activates |
| `initialSize` | `number` | `50` | First panel's initial width/height as a percentage |
| `mobileInitialSize` | `number` | `40` | First panel percentage in the vertical layout |
| `minSize` | `number` | `10` | Minimum first panel percentage |
| `maxSize` | `number` | `90` | Maximum first panel percentage |
| `storageKey` | `string` | — | `localStorage` key for persisting the split ratio |
| `className` | `string` | — | Extra CSS class on the outer container |

---

### `usePlayground` hook

Use this hook when building a fully custom layout or a non-component integration. It manages the engine lifecycle and returns all state and actions.

```tsx
import { usePlayground } from '@setemiojo/playground-react'

function MyPlayground({ template }) {
  const {
    // ── Lifecycle ─────────────────────────────
    status,            // 'initializing' | 'installing' | 'ready' | 'error'
    engine,            // PlaygroundEngine | null — direct engine access

    // ── File system ───────────────────────────
    files,             // FileNode[] — current virtual FS tree
    updateFile,        // (path, content) => Promise<void>
    openFile,          // (path) => Promise<void>

    // ── Preview ───────────────────────────────
    previewUrl,        // string | null — WebContainer dev server URL

    // ── Console ───────────────────────────────
    consoleMessages,   // ConsoleMessage[]
    clearConsole,      // () => void

    // ── Terminal ──────────────────────────────
    terminalMessages,  // TerminalMessage[]
    clearTerminal,     // () => void

    // ── Editor ────────────────────────────────
    showLineNumbers,   // boolean
    toggleLineNumbers, // () => void
    formatCode,        // () => Promise<void>

    // ── Template ──────────────────────────────
    template,          // Template — current active template
    resetCode,         // () => Promise<void> — reset to template defaults
    hiddenFiles,       // string[] — from template.hiddenFiles

    // ── Persistence ───────────────────────────
    saveSnapshot,      // () => Promise<void>

    // ── External ──────────────────────────────
    openInStackBlitz,  // () => Promise<void>
  } = usePlayground(template, options)
}
```

The hook splits its return value into `stableValue` (memoised callbacks) and `volatileValue` (frequently-changing state). Both are also flat-spread for convenience. The split exists so components that only need callbacks don't re-render when, say, `consoleMessages` grows.

---

### `usePlaygroundContext` hook

Access any part of the playground state from a component that is a descendant of `<Playground>`.

```tsx
import { usePlaygroundContext } from '@setemiojo/playground-react'

function StatusBadge() {
  const { status, consoleMessages } = usePlaygroundContext()
  return (
    <span data-status={status}>
      {status} — {consoleMessages.length} log(s)
    </span>
  )
}
```

Returns `PlaygroundContextValue`, which is the union of `PlaygroundStableValue` and `PlaygroundVolatileValue` (see types below).

---

### Context types

```ts
interface PlaygroundStableValue {
  // File operations
  updateFile: (path: string, content: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  // Editor
  toggleLineNumbers: () => void
  formatCode: () => Promise<void>
  // Template
  resetCode: () => Promise<void>
  hiddenFiles: string[]
  // Persistence
  saveSnapshot: () => Promise<void>
  // External
  openInStackBlitz: () => Promise<void>
  // Console / Terminal
  clearConsole: () => void
  clearTerminal: () => void
}

interface PlaygroundVolatileValue {
  engine: PlaygroundEngine | null
  status: PlaygroundStatus          // 'initializing' | 'installing' | 'ready' | 'error'
  files: FileNode[]
  previewUrl: string | null
  showLineNumbers: boolean
  consoleMessages: ConsoleMessage[]
  terminalMessages: TerminalMessage[]
  template: Template | null
}

type PlaygroundContextValue = PlaygroundStableValue & PlaygroundVolatileValue
```

---

### Message types

```ts
interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info'
  text: string
  timestamp: number
}

interface TerminalMessage {
  type: 'stdout' | 'stderr'
  text: string
  timestamp: number
}
```

---

### CSS customization

The stylesheet (`@setemiojo/playground-react/styles`) applies scoped class names that you can override. Key tokens:

```css
/* Panels and layout */
.playground-panel           /* the tabbed output panel */
.playground-panel-tabs      /* the tab bar */
.playground-panel-content   /* panel body */
.playground-editor-container
.playground-file-tree
.playground-terminal-container

/* URL bar (inside the Result tab) */
.panel-url-form
.panel-url-bar
.panel-url-input
.panel-url-dot              /* status indicator dot */
.panel-url-spinner

/* Header */
.playground-header

/* Resizable split */
.playground-resizable
.playground-resizer          /* drag handle */
```

All class names are un-scoped — override them in your own stylesheet by adding specificity:

```css
.my-app .playground-panel-tabs {
  background: #0d0d0d;
  border-bottom: 1px solid #333;
}
```

---

## Core package — `@setemiojo/playground-core` {#core}

The engine layer. Use this directly when you need headless operation, a non-React framework, or lower-level control.

### Installation

```bash
npm install @setemiojo/playground-core
# only needed if using Monaco
npm install monaco-editor
```

---

### `PlaygroundEngine`

Orchestrates the WebContainer, editor, preview server, terminal, file system, and persistence.

```ts
import { PlaygroundEngine } from '@setemiojo/playground-core'

const engine = new PlaygroundEngine({
  editor: 'codemirror',  // 'codemirror' (default) | 'monaco'
  autoSave: true,
  theme: 'dark',
})

// Boot the WebContainer and load a template
await engine.initialize(template)

// Attach UI elements
await engine.mountEditor(editorDiv)   // <div> for the code editor
engine.mountPreview(iframeEl)         // <iframe> for the preview
engine.mountTerminal(terminalDiv)     // <div> for xterm.js

// Subscribe to events (returns unsubscribe fn)
const off = engine.on('status:change', status => console.log(status))
engine.on('console:message', msg => { /* msg.type, msg.args */ })
engine.on('process:output',  out => { /* out.data, out.type */ })
engine.on('file:change',     (path, content) => { })
engine.on('files:update',    files => { })
engine.on('preview:ready',   url => { })
engine.on('error',           err => { })
engine.on('install:progress', ({ current, total }) => { })

// File operations
await engine.updateFile('/src/App.tsx', newContent)
await engine.openFile('/src/App.tsx')
const tree = await engine.getFileTree()   // FileNode[]

// Editor
await engine.switchEditorType('monaco')
engine.setLineNumbers(false)
engine.getEditorContent()                  // string
engine.setEditorContent('...')
await engine.formatCode()

// Template
await engine.switchTemplate(nextTemplate)
await engine.resetToTemplate(template)

// External
await engine.openInStackBlitz(template)

// Persistence
await engine.saveSnapshot()
await engine.loadSnapshot()               // boolean — true if snapshot was restored

// Status
engine.getStatus()                        // PlaygroundStatus

// Cleanup (call when the host component unmounts)
await engine.cleanup()
```

**Static helpers**

```ts
// Pre-boot the WebContainer before initialize() is called
// Useful when you know a playground will be needed soon
await PlaygroundEngine.preboot()

// Access the shared template cache (TTL + LRU)
const cache = PlaygroundEngine.getTemplateCache()
```

---

### Events reference

| Event | Callback signature | When it fires |
|---|---|---|
| `status:change` | `(status: PlaygroundStatus) => void` | Engine moves through lifecycle states |
| `file:change` | `(path: string, content: string) => void` | User edits a file in the editor |
| `files:update` | `(files: FileNode[]) => void` | Virtual FS tree changes (mount, write, rm) |
| `preview:ready` | `(url: string) => void` | Dev server URL becomes available |
| `console:message` | `(message: ConsoleMessage) => void` | `console.*` call from inside the preview iframe |
| `process:output` | `(output: ProcessOutput) => void` | stdout/stderr from the dev server process |
| `error` | `(error: Error) => void` | Engine-level error |
| `install:progress` | `({ current: number, total: number }) => void` | npm install progress |

---

### Status lifecycle

```
initializing  →  installing  →  ready
                              ↘ error
```

`status:change` fires on every transition. `ready` means the dev server is running and `previewUrl` is set.

---

### Editor adapters

Two built-in adapters, both implementing `EditorAdapter`.

| | CodeMirror 6 | Monaco |
|---|---|---|
| Bundle impact | ~250 kB gzipped | ~3.5 MB (lazy-loaded on first use) |
| IntelliSense / autocomplete | No | Yes |
| Peer dependency | — | `monaco-editor ≥ 0.45.0` |

```ts
import { createEditor, createEditorAsync } from '@setemiojo/playground-core'

// Synchronous — CodeMirror only
const editor = createEditor('codemirror', events)

// Async — lazy-loads Monaco via dynamic import()
const editor = await createEditorAsync('monaco', events)

// Check if Monaco is available without loading it
import { isMonacoAvailable } from '@setemiojo/playground-core'
```

**Monaco workers** — if you use Monaco, configure the worker URLs so the editor can load language services in background threads:

```ts
// vite.config.ts
import monacoPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  plugins: [monacoPlugin({ languageWorkers: ['editorWorkerService', 'typescript'] })],
})
```

#### Building a custom adapter

Implement `EditorAdapter` to plug in any editor (Ace, CodeMirror 5, etc.):

```ts
import type { EditorAdapter, EditorOptions } from '@setemiojo/playground-core'

class AceAdapter implements EditorAdapter {
  async initialize(container: HTMLElement, options?: EditorOptions): Promise<void> { }
  async openFile(path: string, content: string): Promise<void> { }
  getContent(): string { return '' }
  setContent(content: string): void { }
  getActiveFile(): string { return '' }
  getOpenTabs(): string[] { return [] }
  closeTab(path: string): void { }
  setLineNumbers(show: boolean): void { }
  getLineNumbers(): boolean { return true }
  destroy(): void { }
}
```

---

### Nanostores atoms

All shared state lives in Nanostores atoms. Read them outside React or subscribe without the hook:

```ts
import {
  $playgroundStatus,
  $files,
  $previewUrl,
  $bootStatus,
} from '@setemiojo/playground-core'

// React
import { useStore } from '@nanostores/react'
const status = useStore($playgroundStatus)
const files  = useStore($files)

// Vanilla — subscribe
const unsub = $playgroundStatus.subscribe(s => console.log(s))

// Vanilla — read current value
import { get } from 'nanostores'
const current = get($playgroundStatus)
```

Available atoms:

| Atom | Type | Description |
|---|---|---|
| `$playgroundStatus` | `PlaygroundStatus` | Current engine lifecycle state |
| `$files` | `FileNode[]` | Virtual filesystem tree |
| `$previewUrl` | `string \| null` | Dev server URL |
| `$bootStatus` | `'booting' \| 'ready' \| 'blocked'` | WebContainer boot status (`blocked` on iOS) |

---

### Core types

```ts
type PlaygroundStatus = 'initializing' | 'installing' | 'ready' | 'error'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]   // only present when type === 'directory'
}

interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info' | 'clear'
  args: any[]
  timestamp: number
}

interface ProcessOutput {
  processId: string
  command: string
  type: 'stdout' | 'stderr'
  data: string
  timestamp: number
}

interface PlaygroundSnapshot {
  version: number
  timestamp: number
  files: Record<string, string>
  openTabs: string[]
  activeFile: string
  templateId: string
}
```

---

## Templates package — `@setemiojo/playground-templates` {#templates}

### Installation

```bash
npm install @setemiojo/playground-templates
```

---

### Built-in templates

| Export | Stack | Notes |
|---|---|---|
| `vanillaTemplate` | Vanilla JS + Vite | No framework |
| `reactTemplate` | React 19 + Vite | JSX, `createRoot` |
| `reactEslintTemplate` | React 19 + Vite + `@setemiojo/eslint-config` | Adds `eslint .` script |
| `vueTemplate` | Vue 3 + Vite | SFC, `createApp` |
| `vueEslintTemplate` | Vue 3 + Vite + `@setemiojo/eslint-config` | Adds `eslint .` script |
| `solidTemplate` | SolidJS 1.9 + `vite-plugin-solid` | `createSignal`, fine-grained reactivity |
| `svelteTemplate` | Svelte 5 + `@sveltejs/vite-plugin-svelte` | Runes API — `$state`, `mount()` |
| `nodeTemplate` | Node.js | Terminal output only, no browser preview |
| `honoTemplate` | Hono + Node.js | HTTP server with `node --watch` hot reload |

```ts
import {
  vanillaTemplate,
  reactTemplate,
  reactEslintTemplate,
  vueTemplate,
  vueEslintTemplate,
  solidTemplate,
  svelteTemplate,
  nodeTemplate,
  honoTemplate,
} from '@setemiojo/playground-templates'
```

---

### `Template` type

```ts
import type { Template } from '@setemiojo/playground-templates'
```

```ts
interface Template {
  /** Unique identifier used by the engine for caching and diffing */
  id: string
  /** Display name */
  name: string
  /** Short description shown in template pickers */
  description: string
  /** Virtual filesystem — follows the WebContainers FileSystemTree format */
  files: FileSystemTree
  /** Runtime npm dependencies (also written to package.json) */
  dependencies: Record<string, string>
  /** Dev npm dependencies (also written to package.json) */
  devDependencies: Record<string, string>
  /** Shell commands */
  commands: {
    dev: string    // required — started automatically on initialize
    build?: string
    test?: string
  }
  /** File opened in the editor by default */
  entryFile: string
  /** Alternative main file (optional) */
  mainFile?: string
  /** Paths hidden from the file tree (e.g. ['/vite.config.js', '/package.json']) */
  hiddenFiles?: string[]
}
```

---

### Custom templates

Build your own template by implementing the `Template` interface. The `files` object follows the [WebContainers `FileSystemTree`](https://webcontainers.io/api#filesystemtree) format: files use `{ file: { contents } }` and directories use `{ directory: { ... } }`.

```ts
import type { Template } from '@setemiojo/playground-templates'

export const myTemplate: Template = {
  id: 'my-app',
  name: 'My App',
  description: 'Custom starter',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'my-app',
          type: 'module',
          scripts: { dev: 'vite' },
          dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
          devDependencies: { '@vitejs/plugin-react': '^6.0.0', vite: '^8.0.0' },
        }, null, 2),
      },
    },
    'vite.config.js': {
      file: {
        contents: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });`,
      },
    },
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>My App</title></head>
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
            contents: `import { createRoot } from 'react-dom/client';
import App from './App';
createRoot(document.getElementById('root')).render(<App />);`,
          },
        },
        'App.jsx': {
          file: {
            contents: `export default function App() {
  return <h1>Hello from my template</h1>;
}`,
          },
        },
      },
    },
  },
  dependencies: {
    'react': '^19.0.0',
    'react-dom': '^19.0.0',
  },
  devDependencies: {
    '@vitejs/plugin-react': '^6.0.0',
    'vite': '^8.0.0',
  },
  commands: { dev: 'npm run dev' },
  entryFile: '/src/App.jsx',
  hiddenFiles: ['/vite.config.js', '/package.json'],
}
```

#### Console output bridging

To capture `console.log` calls from the preview iframe in the playground's Console tab, inject the console forwarder script into your template's `index.html`:

```ts
import { CONSOLE_FORWARDER_SCRIPT } from '@setemiojo/playground-templates/console-forwarder'

// In your template's index.html contents:
const html = `<!DOCTYPE html>
<html>
<head>
  ${CONSOLE_FORWARDER_SCRIPT}
</head>
...`
```

All built-in templates already include this. If you build a custom template without it, `console.*` calls in the preview will not appear in the Console tab.

---

## Host page setup

WebContainers require two HTTP headers on the page that renders the playground.

### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
```

### Next.js

```ts
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin'  },
        ],
      },
    ]
  },
}
export default nextConfig
```

### Vercel (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Opener-Policy",   "value": "same-origin"  }
      ]
    }
  ]
}
```

---

## Architecture

```
Template (FileSystemTree)
    ↓
PlaygroundEngine            ← orchestrates everything
    ├── WebContainerManager     (singleton boot / lifecycle)
    ├── FileSystemManager       (mount, read, write, rm)
    ├── TemplateManager         (diff-based switching — only changed files written)
    ├── TemplateCache           (TTL + LRU — avoids redundant installs)
    ├── EditorController        (CodeMirror 6 or Monaco adapter)
    ├── TerminalController      (xterm.js)
    ├── PreviewServer           (Vite dev server process + console bridge)
    └── PersistenceManager      (localStorage snapshots)
         ↓
    Nanostores atoms ($playgroundStatus, $files, $previewUrl, …)
         ↓
    usePlayground() hook     ← React consumers via @nanostores/react
         ↓
    PlaygroundContext.Provider
         ↓
    <PlaygroundEditor> <PlaygroundFileTree> <PlaygroundPanel> …
```

### Template switching

`PlaygroundEngine.switchTemplate()` calls `TemplateManager.computeDiff()` to find which files changed between the old and new templates. Only those files are written to the WebContainer filesystem — the container is never restarted and the npm install is skipped if the dependency hash is unchanged.

### WebContainer constraints

- **Singleton** — only one WebContainer can exist per page. `WebContainerManager` holds a static instance. Never call `WebContainer.boot()` directly.
- **Cross-origin isolation required** — the host page must serve `COOP: same-origin` and `COEP: require-corp`.
- **iOS/iPadOS not supported** — `checkPlatformSupport()` detects and sets `$bootStatus = 'blocked'`.
- **`WebContainerProcess.kill()` returns `void`**, not `Promise<void>`.

---

## Development

```bash
# Install dependencies
pnpm install

# Start all packages in watch mode
pnpm dev

# Build all packages in dependency order
pnpm build

# Run tests once
pnpm test:run

# Run tests in watch mode
pnpm test

# Type-check all packages
pnpm typecheck

# Lint
pnpm lint
```

Run a single test file:

```bash
pnpm vitest run packages/core/src/engine/EventEmitter.test.ts
```

### Monorepo structure

```
packages/
  core/       @setemiojo/playground-core       engine, state, editor adapters
  react/      @setemiojo/playground-react      React components and hooks
  templates/  @setemiojo/playground-templates  built-in templates
apps/
  demo/                                        Vite + React integration demo
```

### Adding a new template

1. Create `packages/templates/src/<name>.ts` implementing `Template`.
2. Embed `CONSOLE_FORWARDER_SCRIPT` in `index.html` contents.
3. Export from `packages/templates/src/index.ts`.
4. Add to the demo's `App.tsx` template map and radio group.
5. Run `pnpm build` and `pnpm typecheck` to verify.

---

## License

MIT © [Oluwasetemi Ojo](https://github.com/Oluwasetemi)

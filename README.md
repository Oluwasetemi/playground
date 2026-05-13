# @setemiojo/playground

A full-featured, in-browser code playground powered by [WebContainers](https://webcontainers.io/). Run real Node.js, install npm packages, and preview live output — all inside an iframe, no server required.

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
- The host page **must** set these HTTP headers (WebContainers requirement):
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
  See [Vite config example](#vite-setup) or the [Vercel config](#vercel-setup) below.
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

### `<Playground>`

The root provider. Boots the WebContainer, mounts the engine, and exposes state via context to all child components.

```tsx
import { Playground } from '@setemiojo/playground-react'

<Playground
  template={reactTemplate}   // required — Template object
  options={{                 // optional
    editor: 'codemirror',    // 'codemirror' (default) | 'monaco'
    autoSave: true,          // persist edits to localStorage
    autoSaveInterval: 2000,  // ms between auto-saves (default: 2000)
    theme: 'dark',           // 'dark' | 'light'
    showLineNumbers: true,
    editorOptions: {
      fontSize: 14,
      tabSize: 2,
      wordWrap: 'on',
      minimap: false,        // Monaco only
    },
  }}
>
  {/* any mix of playground components */}
</Playground>
```

> **Editor toggle at runtime** — pass `editor: editorType` as a state variable. The engine hot-swaps the adapter in-place without restarting the WebContainer or losing in-flight installs.

---

### Components

#### `<PlaygroundEditor>`

Mounts the code editor (CodeMirror 6 or Monaco) and handles file opens, language switching, and formatting.

```tsx
<PlaygroundEditor />
```

No props required — reads everything from context.

---

#### `<PlaygroundPanel>`

Tabbed output panel with **Result** (iframe preview), **Console**, and **Terminal** tabs.

```tsx
<PlaygroundPanel defaultTab="result" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultTab` | `'result' \| 'console' \| 'terminal'` | `'result'` | Tab shown on mount |

---

#### `<PlaygroundFileTree>`

Renders the virtual file system as a clickable tree. Automatically hides files listed in the template's `hiddenFiles` array.

```tsx
<PlaygroundFileTree />
```

---

#### `<PlaygroundHeader>`

Status dot, title, and sidebar toggle button.

```tsx
<PlaygroundHeader
  title="React Playground"
  onToggleSidebar={() => setShowSidebar(s => !s)}
  showSidebar={showSidebar}
/>
```

---

#### `<PlaygroundPreview>`

Standalone iframe for the live preview (also available as the Result tab inside `<PlaygroundPanel>`).

```tsx
<PlaygroundPreview />
```

---

#### `<Terminal>`

xterm.js terminal that renders process output with full ANSI colour support and auto-fit on resize.

```tsx
import { Terminal } from '@setemiojo/playground-react'

<Terminal
  messages={terminalMessages}
  theme={{ background: '#1e1e1e', foreground: '#d4d4d4' }}
  fontSize={13}
  fontFamily="Menlo, monospace"
/>
```

| Prop | Type | Default |
|---|---|---|
| `messages` | `TerminalMessage[]` | `[]` |
| `className` | `string` | `''` |
| `theme` | `{ background?, foreground?, cursor?, cursorAccent?, selectionBackground? }` | VS Code Dark+ |
| `fontSize` | `number` | `13` |
| `fontFamily` | `string` | `'Menlo, Monaco, "Courier New", monospace'` |
| `lineHeight` | `number` | `1.4` |

---

#### `<ResizablePanel>`

Drag-to-resize split pane. Persists size to `localStorage` and collapses to vertical on mobile.

```tsx
<ResizablePanel
  firstPanel={<PlaygroundEditor />}
  secondPanel={<PlaygroundPanel />}
  direction="horizontal"       // 'horizontal' | 'vertical'
  responsive                   // auto-switches to vertical below breakpoint
  responsiveBreakpoint={768}   // px (default: 768)
  initialSize={50}             // % for first panel (default: 50)
  mobileInitialSize={40}       // % used in vertical layout
  minSize={20}                 // %
  maxSize={80}                 // %
  storageKey="my-panel-size"   // localStorage key for persistence
/>
```

---

### `usePlayground` hook

Use this when you need full control outside the pre-built component tree, or are building a custom provider.

```tsx
import { usePlayground } from '@setemiojo/playground-react'

function MyPlayground() {
  const {
    // State
    status,           // 'initializing' | 'installing' | 'ready' | 'error'
    files,            // FileNode[]
    previewUrl,       // string | null
    consoleMessages,  // ConsoleMessage[]
    terminalMessages, // TerminalMessage[]
    showLineNumbers,

    // Actions
    updateFile,       // (path: string, content: string) => Promise<void>
    openFile,         // (path: string) => Promise<void>
    clearConsole,     // () => void
    clearTerminal,    // () => void
    toggleLineNumbers,
    saveSnapshot,

    // Engine escape hatch
    engine,           // PlaygroundEngine | null
  } = usePlayground(template, options)
}
```

---

### `usePlaygroundContext` hook

Access the playground state from any component inside `<Playground>`.

```tsx
import { usePlaygroundContext } from '@setemiojo/playground-react'

function StatusBadge() {
  const { status } = usePlaygroundContext()
  return <span data-status={status}>{status}</span>
}
```

---

## Core package — `@setemiojo/playground-core` {#core}

Use the engine directly when you need headless operation or want to integrate with a non-React UI.

### Installation

```bash
npm install @setemiojo/playground-core
# optional peer dep — only needed if using Monaco
npm install monaco-editor
```

### `PlaygroundEngine`

```ts
import { PlaygroundEngine } from '@setemiojo/playground-core'

const engine = new PlaygroundEngine({
  editor: 'codemirror',  // 'codemirror' (default) | 'monaco'
  autoSave: true,
  theme: 'dark',
})

// Boot WebContainer and load a template
await engine.initialize(template)

// Mount UI elements
await engine.mountEditor(editorContainerEl)  // <div> for the editor
engine.mountPreview(iframeEl)               // <iframe> for the preview
await engine.mountTerminal(terminalContainerEl)

// Listen to events
engine.on('status:change', status => console.log(status))
engine.on('console:message', msg => console.log(msg.type, msg.args))
engine.on('process:output', out => process.stdout.write(out.data))
engine.on('file:change', (path, content) => { })
engine.on('error', err => console.error(err))

// File operations
await engine.updateFile('/src/App.tsx', newContent)
await engine.openFile('/src/App.tsx')

// Switch editor without restarting WebContainer
await engine.switchEditorType('monaco')

// Persistence
await engine.saveSnapshot()
await engine.restoreSnapshot()

// Cleanup
await engine.cleanup()
```

#### Events

| Event | Payload | When it fires |
|---|---|---|
| `status:change` | `PlaygroundStatus` | Engine moves through lifecycle states |
| `file:change` | `(path: string, content: string)` | User edits a file in the editor |
| `files:update` | `FileNode[]` | File system tree changes |
| `preview:ready` | `url: string` | Dev server URL is available |
| `console:message` | `ConsoleMessage` | `console.*` call from inside the preview iframe |
| `process:output` | `ProcessOutput` | stdout/stderr from the dev server process |
| `error` | `Error` | Engine-level error |
| `install:progress` | `{ current: number, total: number }` | npm install progress |

#### Status lifecycle

```
initializing → installing → ready
                          ↘ error
```

---

### Editor adapters

Two built-in adapters, both implementing the `EditorAdapter` interface.

| | CodeMirror 6 | Monaco |
|---|---|---|
| Bundle impact | ~250 kB | ~3.5 MB (lazy loaded) |
| Load strategy | Synchronous | Dynamic import on first use |
| IntelliSense / autocomplete | No | Yes |
| Peer dependency | — | `monaco-editor ≥ 0.45.0` |

```ts
import { createEditor, createEditorAsync } from '@setemiojo/playground-core'

// Synchronous — CodeMirror only
const editor = createEditor('codemirror', events)

// Async — lazy-loads Monaco on demand
const editor = await createEditorAsync('monaco', events)
```

#### Building a custom adapter

Implement `EditorAdapter` to plug in any editor (e.g. Ace, Codemirror 5):

```ts
import type { EditorAdapter, EditorOptions } from '@setemiojo/playground-core'

class AceEditor implements EditorAdapter {
  async initialize(container: HTMLElement, options?: EditorOptions) { /* mount Ace */ }
  async openFile(path: string, content: string) { /* load file */ }
  getContent(): string { return '' }
  setContent(content: string) { }
  getActiveFile(): string { return '' }
  getOpenTabs(): string[] { return [] }
  closeTab(path: string) { }
  setLineNumbers(show: boolean) { }
  getLineNumbers(): boolean { return true }
  destroy() { }
}
```

---

### Nanostores atoms

All shared state lives in Nanostores atoms. Subscribe directly when working outside React:

```ts
import { $playgroundStatus, $files, $previewUrl } from '@setemiojo/playground-core'
import { useStore } from '@nanostores/react'         // React
import { get }      from 'nanostores'                // vanilla

// React
const status = useStore($playgroundStatus)

// Vanilla
$playgroundStatus.subscribe(status => console.log(status))
const currentStatus = get($playgroundStatus)
```

---

## Templates package — `@setemiojo/playground-templates` {#templates}

### Built-in templates

```ts
import {
  vanillaTemplate,  // Vanilla JS + Vite
  reactTemplate,    // React 19 + Vite
  vueTemplate,      // Vue 3 + Vite
  nodeTemplate,     // Node.js (terminal output, no browser preview)
} from '@setemiojo/playground-templates'
```

### Custom templates

```ts
import type { Template } from '@setemiojo/playground-templates'

const svelteTemplate: Template = {
  id: 'svelte',
  name: 'Svelte',
  description: 'Svelte 5 + Vite',
  files: {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'svelte-app',
          scripts: { dev: 'vite' },
          devDependencies: { svelte: '^5.0.0', vite: '^6.0.0' },
        }, null, 2),
      },
    },
    'src': {
      directory: {
        'App.svelte': {
          file: { contents: '<h1>Hello from Svelte</h1>' },
        },
      },
    },
  },
  dependencies: {},
  devDependencies: {
    'svelte': '^5.0.0',
    'vite': '^6.0.0',
    '@sveltejs/vite-plugin-svelte': '^4.0.0',
  },
  commands: { dev: 'npm run dev' },
  entryFile: '/src/App.svelte',
  hiddenFiles: ['/vite.config.js', '/package.json'],  // hide from file tree
}
```

The `files` object follows the [WebContainers `FileSystemTree`](https://webcontainers.io/api#filesystemtree) format — `{ file: { contents } }` for files and `{ directory: { ... } }` for folders.

---

## Host page setup

### Vite setup

```ts
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
```

### Vercel setup

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

## Development

```bash
# Install dependencies
pnpm install

# Start all packages in watch mode
pnpm dev

# Build all packages
pnpm build

# Run tests once
pnpm test:run

# Type-check all packages
pnpm typecheck

# Lint
pnpm lint
```

### Monorepo structure

```
packages/
  core/       @setemiojo/playground-core      — engine, state, editor adapters
  react/      @setemiojo/playground-react     — React components and hooks
  templates/  @setemiojo/playground-templates — built-in templates
apps/
  demo/                                       — Vite + React integration demo
```

---

## License

MIT © [Oluwasetemi Ojo](https://github.com/Oluwasetemi)

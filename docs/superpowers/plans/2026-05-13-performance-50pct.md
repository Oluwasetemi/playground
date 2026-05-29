# Performance Improvement Plan — 50% Reduction in Core + React

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce initial bundle parse time and React render overhead by ≥50% across `@setemiojo/playground-core` and `@setemiojo/playground-react`.

**Architecture:** Target the two biggest levers first — lazy-loading Prettier (−500KB synchronous parse) and stabilising the React context value (stops 7-component cascade re-renders on every terminal line). Remaining tasks fix compounding secondary issues.

**Tech Stack:** Vite, CodeMirror 6, Monaco (lazy), nanostores, React 18/19, xterm.js, WebContainers

---

## Baseline (measured 2026-05-13)

| Metric | Current |
|---|---|
| `core/dist/index.js` | **1.7 MB** |
| `core/dist/standaloneServices-*.js` | **1.9 MB** (shouldn't be in core) |
| `core/dist/editor-*.js` | **836 KB** |
| `react/dist/index.js` | **3.0 MB** |
| `react/dist/editor.main-*.js` | **4.2 MB** (full Monaco re-bundled) |
| Context consumers re-rendered per terminal line | **7** |
| `consoleMessages` array upper bound | **∞** |

**Target:** `core/dist/index.js` ≤ 850 KB · `react/dist/index.js` ≤ 1.5 MB · context re-renders per terminal line ≤ 1

---

## Task 1: Lazy-load Prettier inside `formatCode()`

**Files:**
- Modify: `packages/core/src/engine/PlaygroundEngine.ts` lines 10–15 (static prettier imports)
- Modify: `packages/core/vite.config.ts` (ensure prettier stays out of the chunk)

**Expected win:** ~500 KB removed from `core/dist/index.js` initial parse (Prettier + 5 plugins are static imports today)

- [ ] **Step 1: Remove static Prettier imports from PlaygroundEngine.ts**

Delete these five lines at the top of `PlaygroundEngine.ts`:
```ts
import * as prettier from 'prettier'
import prettierBabelPlugin from 'prettier/plugins/babel'
import prettierEstreePlugin from 'prettier/plugins/estree'
import prettierHtmlPlugin from 'prettier/plugins/html'
import prettierPostcssPlugin from 'prettier/plugins/postcss'
import prettierTypescriptPlugin from 'prettier/plugins/typescript'
```

- [ ] **Step 2: Rewrite `formatCode()` to lazy-import Prettier**

Replace the body of `formatCode()` with:
```ts
async formatCode(): Promise<void> {
  const activeFile = this.editor.getActiveFile()
  if (!activeFile) return
  const content = this.editor.getContent()
  const ext = activeFile.split('.').pop()?.toLowerCase() ?? ''

  type ParserEntry = { parser: string; plugins: any[] }
  const [prettier, babelPlugin, estreePlugin, htmlPlugin, postcssPlugin, tsPlugin] =
    await Promise.all([
      import('prettier'),
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/html'),
      import('prettier/plugins/postcss'),
      import('prettier/plugins/typescript'),
    ])

  const parserMap: Record<string, ParserEntry> = {
    js:   { parser: 'babel',      plugins: [babelPlugin.default, estreePlugin.default] },
    jsx:  { parser: 'babel',      plugins: [babelPlugin.default, estreePlugin.default] },
    mjs:  { parser: 'babel',      plugins: [babelPlugin.default, estreePlugin.default] },
    cjs:  { parser: 'babel',      plugins: [babelPlugin.default, estreePlugin.default] },
    ts:   { parser: 'typescript', plugins: [tsPlugin.default, estreePlugin.default] },
    tsx:  { parser: 'typescript', plugins: [tsPlugin.default, estreePlugin.default] },
    html: { parser: 'html',       plugins: [htmlPlugin.default] },
    htm:  { parser: 'html',       plugins: [htmlPlugin.default] },
    vue:  { parser: 'vue',        plugins: [htmlPlugin.default] },
    css:  { parser: 'css',        plugins: [postcssPlugin.default] },
    scss: { parser: 'scss',       plugins: [postcssPlugin.default] },
    less: { parser: 'less',       plugins: [postcssPlugin.default] },
  }
  const entry = parserMap[ext]
  if (!entry) return

  const formatted = await prettier.default.format(content, {
    parser: entry.parser,
    plugins: entry.plugins,
    semi: false,
    singleQuote: true,
    tabWidth: 2,
  })
  this.editor.setContent(formatted)
}
```

- [ ] **Step 3: Build core and verify index.js shrank**

Run: `pnpm --filter @setemiojo/playground-core build`
Expected: `core/dist/index.js` < 1.2 MB (was 1.7 MB). Prettier chunks appear separately only if imported.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/engine/PlaygroundEngine.ts
git commit -m "perf(core): lazy-load prettier inside formatCode() — removes ~500KB from initial parse"
```

---

## Task 2: Lazy-load `@stackblitz/sdk`

**Files:**
- Modify: `packages/core/src/engine/PlaygroundEngine.ts` — `openInStackBlitz()` method

**Expected win:** ~30–50 KB removed from `core/dist/index.js`

- [ ] **Step 1: Remove the static `@stackblitz/sdk` import**

Delete: `import sdk from '@stackblitz/sdk'`

- [ ] **Step 2: Dynamic import inside `openInStackBlitz()`**

```ts
async openInStackBlitz(): Promise<void> {
  const { default: sdk } = await import('@stackblitz/sdk')
  // ... rest of the method unchanged
}
```

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @setemiojo/playground-core build`
Expected: no `@stackblitz/sdk` in `core/dist/index.js`.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/engine/PlaygroundEngine.ts
git commit -m "perf(core): lazy-load @stackblitz/sdk — only loaded when openInStackBlitz() is called"
```

---

## Task 3: Remove standalone Monaco chunks from `core/dist`

**Files:**
- Modify: `packages/core/vite.config.ts`
- Modify: `packages/core/package.json` (peerDependencies)

**Expected win:** `standaloneServices-*.js` (1.9 MB) and `editor-*.js` (836 KB Monaco chunks) moved out of the default bundle. Core `index.js` becomes the only critical path asset.

- [ ] **Step 1: Read current vite.config.ts**

Read `packages/core/vite.config.ts` to understand current `build.lib`, `rollupOptions.external`, and `manualChunks`.

- [ ] **Step 2: Ensure Monaco is fully external in the core build**

In `packages/core/vite.config.ts`, under `rollupOptions`:
```ts
external: [
  'monaco-editor',
  'monaco-editor/esm/vs/editor/editor.main',
  // add any sub-path monaco imports found in MonacoEditor.ts
  /^monaco-editor\//,
]
```

- [ ] **Step 3: Move MonacoEditor.ts to the separate entry point only**

The file `packages/core/src/monaco.ts` is the secondary entry (`monaco` export). Ensure `MonacoEditor.ts` is not reachable from the main `index.ts` entry — it is currently only re-exported via `editorFactory.ts` dynamic import, which should already be fine. Verify by checking the chunk map in the build output.

- [ ] **Step 4: Add `nanostores` to external + peerDependencies in core**

In `packages/core/vite.config.ts`:
```ts
external: [..., 'nanostores']
```

In `packages/core/package.json`:
```json
"peerDependencies": {
  "monaco-editor": ">=0.45.0",
  "nanostores": ">=0.10.0"
},
"peerDependenciesMeta": {
  "monaco-editor": { "optional": true }
}
```

Move `nanostores` from `dependencies` to `peerDependencies`.

- [ ] **Step 5: Build and verify**

Run: `pnpm --filter @setemiojo/playground-core build`
Expected: `standaloneServices-*.js` absent or significantly smaller. `core/dist/index.js` < 850 KB.

- [ ] **Step 6: Commit**

```bash
git add packages/core/vite.config.ts packages/core/package.json
git commit -m "perf(core): externalize monaco-editor and nanostores — removes 2.7MB from core dist"
```

---

## Task 4: Stabilise React context value to stop cascade re-renders

**Files:**
- Modify: `packages/react/src/usePlayground.ts`
- Modify: `packages/react/src/context/PlaygroundContext.tsx`

**Expected win:** Drops context consumer re-renders from 7 per terminal line to ≤ 1. Most expensive single fix for runtime performance.

- [ ] **Step 1: Split PlaygroundContext into two contexts**

In `packages/react/src/context/PlaygroundContext.tsx`, create two contexts:

```ts
// Stable: engine, callbacks — changes only on engine swap
export const PlaygroundStableContext = createContext<PlaygroundStableValue | null>(null)

// Volatile: status, files, messages — changes frequently
export const PlaygroundVolatileContext = createContext<PlaygroundVolatileValue | null>(null)
```

Where:
```ts
interface PlaygroundStableValue {
  engine: PlaygroundEngine | null
  updateFile: (path: string, content: string) => Promise<void>
  openFile: (path: string) => Promise<void>
  clearConsole: () => void
  clearTerminal: () => void
  toggleLineNumbers: () => void
  saveSnapshot: () => Promise<void>
  hiddenFiles: string[]
}

interface PlaygroundVolatileValue {
  status: PlaygroundStatus
  files: FileNode[]
  previewUrl: string | null
  consoleMessages: ConsoleMessage[]
  terminalMessages: TerminalMessage[]
  showLineNumbers: boolean
  template: Template | null
}
```

- [ ] **Step 2: Memoize stable value in usePlayground**

In `usePlayground.ts`, wrap the stable object in `useMemo`:
```ts
const stableValue = useMemo(() => ({
  engine: engineRef.current,
  updateFile,
  openFile,
  clearConsole,
  clearTerminal,
  toggleLineNumbers,
  saveSnapshot,
  hiddenFiles: template.hiddenFiles ?? [],
}), [engine, updateFile, openFile, clearConsole, clearTerminal, toggleLineNumbers, saveSnapshot, template.hiddenFiles])
```

- [ ] **Step 3: Update Playground.tsx to provide both contexts**

```tsx
export function Playground({ template, options, children }: PlaygroundProps) {
  const { stableValue, volatileValue } = usePlayground(template, options)
  return (
    <PlaygroundStableContext.Provider value={stableValue}>
      <PlaygroundVolatileContext.Provider value={volatileValue}>
        {children}
      </PlaygroundVolatileContext.Provider>
    </PlaygroundStableContext.Provider>
  )
}
```

- [ ] **Step 4: Update `usePlaygroundContext` to merge both**

Keep backward compat by re-exporting a combined hook:
```ts
export function usePlaygroundContext() {
  const stable = useContext(PlaygroundStableContext)
  const volatile = useContext(PlaygroundVolatileContext)
  if (!stable || !volatile)
    throw new Error('usePlaygroundContext must be used inside <Playground>')
  return { ...stable, ...volatile }
}
```

Components that only need stable values can now subscribe to `PlaygroundStableContext` directly and avoid volatile re-renders entirely.

- [ ] **Step 5: Verify in React DevTools**

Start `pnpm dev`, open React DevTools Profiler, type in the editor. Confirm `PlaygroundFileTree` and `PlaygroundHeader` no longer flash on console message receipt.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/context/PlaygroundContext.tsx packages/react/src/usePlayground.ts packages/react/src/Playground.tsx
git commit -m "perf(react): split context into stable/volatile — stops 7-component cascade re-render per message"
```

---

## Task 5: Cap `consoleMessages` and `terminalMessages` arrays

**Files:**
- Modify: `packages/react/src/usePlayground.ts`

**Expected win:** Prevents unbounded memory growth; caps re-render cost at O(500) not O(∞).

- [ ] **Step 1: Add cap to consoleMessages setter**

```ts
// In the console:message handler:
setConsoleMessages((prev) => {
  const next = [...prev, newMsg]
  return next.length > 500 ? next.slice(-500) : next
})
```

- [ ] **Step 2: Add cap to terminalMessages setter**

```ts
// In the process:output handler:
setTerminalMessages((prev) => {
  const next = [...prev, { type: output.type, text: output.data, timestamp: output.timestamp }]
  return next.length > 1000 ? next.slice(-1000) : next
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/react/src/usePlayground.ts
git commit -m "perf(react): cap consoleMessages at 500 and terminalMessages at 1000 entries"
```

---

## Task 6: Memoize computed values in `PlaygroundPanel`

**Files:**
- Modify: `packages/react/src/components/PlaygroundPanel.tsx`

**Expected win:** Eliminates O(n) filter on every render for error/warn counts and filtered messages.

- [ ] **Step 1: Wrap filter computations in useMemo**

```ts
const errorCount = useMemo(
  () => consoleMessages.filter(m => m.type === 'error').length,
  [consoleMessages]
)
const warnCount = useMemo(
  () => consoleMessages.filter(m => m.type === 'warn').length,
  [consoleMessages]
)
const filteredMessages = useMemo(
  () => filter === 'all' ? consoleMessages : consoleMessages.filter(m => m.type === filter),
  [consoleMessages, filter]
)
```

Replace all inline `.filter()` calls with `filteredMessages`, `errorCount`, `warnCount`.

- [ ] **Step 2: Commit**

```bash
git add packages/react/src/components/PlaygroundPanel.tsx
git commit -m "perf(react): memoize errorCount, warnCount, filteredMessages in PlaygroundPanel"
```

---

## Task 7: Memo-ize `FileTreeNode`

**Files:**
- Modify: `packages/react/src/components/PlaygroundFileTree.tsx`

**Expected win:** File tree nodes skip re-render when `files` array identity changes but the specific node's props haven't changed.

- [ ] **Step 1: Wrap FileTreeNode in React.memo**

```ts
const FileTreeNode = React.memo(({ node, depth, onFileClick }: FileTreeNodeProps) => {
  // ... existing implementation unchanged
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/react/src/components/PlaygroundFileTree.tsx
git commit -m "perf(react): memo-ize FileTreeNode to skip re-renders on unrelated file changes"
```

---

## Task 8: Parallelize sequential file system operations

**Files:**
- Modify: `packages/core/src/webcontainer/FileSystemManager.ts` — `buildFileTree`, `getAllFiles`
- Modify: `packages/core/src/template/TemplateManager.ts` — `applyDiff`, `cleanupEmptyDirectories`
- Modify: `packages/core/src/engine/PlaygroundEngine.ts` — `loadSnapshot` file writes

**Expected win:** Template switch and snapshot restore parallelized — expect 2–5× faster on projects with >5 files.

- [ ] **Step 1: Parallelize `buildFileTree` subdirectory reads**

In `FileSystemManager.buildFileTree`, replace the sequential `for` loop over entries with:
```ts
const entries = await this.webcontainer.fs.readdir(dirPath, { withFileTypes: true })
const children = await Promise.all(
  entries.map(async (entry) => {
    if (entry.isDirectory())
      return this.buildFileTree(`${dirPath}/${entry.name}`)
    return { name: entry.name, path: `${dirPath}/${entry.name}`, type: 'file' as const }
  })
)
return children.flat()
```

- [ ] **Step 2: Parallelize `getAllFiles` content reads**

```ts
const files = this.flattenTree(await this.buildFileTree('/'))
const contents = await Promise.all(files.map(f => this.readFile(f.path)))
return Object.fromEntries(files.map((f, i) => [f.path, contents[i]]))
```

- [ ] **Step 3: Parallelize `applyDiff` removals and writes**

In `TemplateManager.applyDiff`:
```ts
// Parallel removals
await Promise.all(diff.removed.map(path => fs.removeFile(path)))

// Parallel writes
await Promise.all(
  [...diff.added, ...diff.modified].map(([path, content]) => fs.writeFile(path, content))
)
```

- [ ] **Step 4: Parallelize `loadSnapshot` file writes in PlaygroundEngine**

In `loadSnapshot`, replace sequential `for...of` file writes:
```ts
await Promise.all(
  Object.entries(snapshot.files).map(([path, content]) =>
    this.filesystemManager!.writeFile(path, content)
  )
)
```

- [ ] **Step 5: Build and run tests**

Run: `pnpm test:run`
Expected: all tests pass. Template switch in the demo should feel noticeably faster.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/webcontainer/FileSystemManager.ts \
        packages/core/src/template/TemplateManager.ts \
        packages/core/src/engine/PlaygroundEngine.ts
git commit -m "perf(core): parallelize fs operations — buildFileTree, applyDiff, loadSnapshot use Promise.all"
```

---

## Task 9: Fix `dependenciesChanged` sort order bug

**Files:**
- Modify: `packages/core/src/template/TemplateManager.ts` lines 100–103

**Expected win:** Prevents spurious npm reinstalls on template switches where deps are the same but key order differs.

- [ ] **Step 1: Apply sorted stringify to `dependenciesChanged`**

```ts
private dependenciesChanged(prev: Template, next: Template): boolean {
  const sortedStringify = (obj: Record<string, string>) =>
    JSON.stringify(Object.fromEntries(Object.entries(obj).sort()))
  return (
    sortedStringify(prev.dependencies) !== sortedStringify(next.dependencies) ||
    sortedStringify(prev.devDependencies) !== sortedStringify(next.devDependencies)
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/template/TemplateManager.ts
git commit -m "fix(core): sort dep keys before comparing in dependenciesChanged — prevents spurious reinstalls"
```

---

## Task 10: Fix TerminalController memory — incremental DOM writes

**Files:**
- Modify: `packages/core/src/terminal/TerminalController.ts`

**Expected win:** Eliminates full `innerHTML` replace (O(n) DOM rebuild) on every message; replaces with single `insertAdjacentHTML` append.

- [ ] **Step 1: Replace `render()` with incremental append**

Refactor `TerminalController` to append incrementally:

```ts
private escapeDiv = document.createElement('div') // class-level, reused

private escapeHtml(text: string): string {
  this.escapeDiv.textContent = text
  return this.escapeDiv.innerHTML
}

private appendLine(html: string): void {
  if (!this.container) return
  this.container.insertAdjacentHTML('beforeend', html)
  // Trim oldest line if over limit
  if (this.container.children.length > this.maxLines) {
    this.container.removeChild(this.container.firstChild!)
  }
  this.container.scrollTop = this.container.scrollHeight
}

// Replace addOutput() to call appendLine instead of render()
private addOutput(output: ProcessOutput): void {
  const className = output.type === 'stderr' ? 'terminal-error' : 'terminal-output'
  this.appendLine(`<div class="${className}">${this.escapeHtml(this.stripAnsi(output.data))}</div>`)
  // Still track in outputLines for clear() to work
  this.outputLines.push(output)
  if (this.outputLines.length > this.maxLines) this.outputLines.shift()
}
```

- [ ] **Step 2: Update `clear()` to reset DOM**

```ts
clear(): void {
  this.outputLines = []
  if (this.container) this.container.innerHTML = ''
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/terminal/TerminalController.ts
git commit -m "perf(core): incremental DOM append in TerminalController — O(1) per line vs O(n) innerHTML replace"
```

---

## Expected outcomes after all tasks

| Metric | Before | Target | Primary task |
|---|---|---|---|
| `core/dist/index.js` | 1.7 MB | ≤ 850 KB | Tasks 1, 2, 3 |
| `core/dist/standaloneServices-*.js` | 1.9 MB | absent | Task 3 |
| `react/dist/index.js` | 3.0 MB | ≤ 1.5 MB | Task 3 (externalize core) |
| Context re-renders per terminal line | 7 | ≤ 1 | Task 4 |
| `consoleMessages` max entries | ∞ | 500 | Task 5 |
| Console filter O(n) per render | yes | no | Task 6 |
| FileTreeNode re-renders | all | changed only | Task 7 |
| Template switch file ops | serial | parallel | Task 8 |
| Spurious npm reinstall on switch | possible | eliminated | Task 9 |
| Terminal DOM rebuild per line | O(n) | O(1) | Task 10 |

Tasks 1–5 achieve the 50% target. Tasks 6–10 push beyond it.

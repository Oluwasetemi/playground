# @setemiojo/playground-core

## 0.4.0

### Minor Changes

- Add Terminal component, Monaco editor adapter, and hidden files support

  New features:
  - `Terminal` React component backed by xterm.js with FitAddon, full ANSI rendering, and resize-aware layout
  - `TerminalController` in core for HTML-based process output rendering with ANSI stripping
  - Pluggable editor architecture: `EditorAdapter` interface with `CodeMirrorEditor` and lazy-loadable `MonacoEditor`
  - `hiddenFiles` property on `Template` to exclude files from the file tree
  - `console.clear` forwarded from WebContainer iframe clears the console panel
  - `process:output` events pipe dev-server stdout/stderr to the Terminal tab
  - `terminalMessages` and `clearTerminal` exposed via `usePlayground` hook and `PlaygroundContext`
  - `ResizablePanel` now tolerates sandboxed environments that block `localStorage`

### Patch Changes

- Update and fixes across the playground

## 0.3.0

### Minor Changes

- Fix critical editor crashes, extend formatting support, and add UX improvements

  **Bug fixes**
  - Remove `autocompletion()` and `@codemirror/lang-vue` from EditorController — both caused a `children is undefined` crash when opening `.vue` or `.html` files due to incompatibility between `@codemirror/lang-vue@0.1.3` and current `@lezer/common`. Vue files now use the JavaScript parser as a safe fallback.
  - Extend `formatCode()` to support `.html`, `.htm`, `.vue`, `.css`, `.scss`, and `.less` using the correct Prettier plugins (`prettier/plugins/html`, `prettier/plugins/postcss`)
  - Fix `EISDIR` error when removing directory-type files during template switching — pass `{ recursive: true, force: true }` to `fs.rm()`
  - Fix Vite process not being killed during template switches — `PreviewServer.stop()` now tracks and kills the spawned process
  - Fix dependency install being skipped on template switch — `this.currentTemplate` is now updated before `installDependencies()` computes the dep hash
  - Fix React effect cleanup aborting in-flight `switchTemplate()` — split single effect into two: one for subscriptions (`[template.id]`), one for teardown (`[]`)

  **New features**
  - DevTools-style console panel with filter toolbar (All/Log/Warn/Error/Info), per-type row colors, timestamps, and error/warning badge coloring
  - File tree skeleton with staggered pulse animation during template switching
  - Editor switching overlay with animated indicator during `initializing`/`installing` states
  - Horizontal/vertical layout toggle button in the demo app

## 0.2.0

### Minor Changes

- e2063e4: update packages

## 0.1.1

### Patch Changes

- 9e125dc: Releasing 0.1.0 of the playground

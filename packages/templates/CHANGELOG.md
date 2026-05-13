# @setemiojo/playground-templates

## 0.3.0

### Minor Changes

- Update and fixes across the playground
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

## 0.2.0

### Minor Changes

- e2063e4: update packages

## 0.1.1

### Patch Changes

- 9e125dc: Releasing 0.1.0 of the playground

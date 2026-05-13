# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start all packages in dev mode (Turborepo)
pnpm build            # Build all packages in dependency order
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Run tests with V8 coverage
pnpm lint             # ESLint across all packages
pnpm typecheck        # tsc --noEmit across all packages
```

Run a single test file:
```bash
pnpm vitest run packages/core/src/engine/EventEmitter.test.ts
```

Run tests matching a pattern:
```bash
pnpm vitest run --reporter=verbose -t "EventEmitter"
```

## Architecture

This is a **pnpm + Turborepo monorepo** with three packages and one demo app:

```
packages/
  core/      @setemiojo/playground-core     — engine, state, no framework deps
  react/     @setemiojo/playground-react    — React components + hooks
  templates/ @setemiojo/playground-templates — Template definitions (TS source)
apps/
  demo/                                     — Vite + React integration demo
```

### Data flow

```
Template (FileSystemTree)
    ↓
PlaygroundEngine          ← orchestrates everything
    ├── WebContainerManager   (singleton WebContainer boot/lifecycle)
    ├── FileSystemManager     (mount, read, write, rm with recursive support)
    ├── TemplateManager       (diff-based template switching, minimal FS writes)
    ├── TemplateCache         (TTL + LRU cache, avoids redundant mounts)
    ├── EditorController      (CodeMirror 6, Compartment-based lang switching)
    ├── TerminalController    (xterm.js terminal)
    ├── PreviewServer         (Vite dev server process + postMessage console bridge)
    └── PersistenceManager    (localStorage snapshots, auto-save)
         ↓
    Nanostores atoms ($playgroundStatus, $files, $previewUrl, etc.)
         ↓
    usePlayground() hook  ← React consumers read stores via @nanostores/react
         ↓
    PlaygroundContext.Provider
         ↓
    <PlaygroundEditor> <PlaygroundFileTree> <PlaygroundPanel> <PlaygroundPreview> …
```

### WebContainer constraints

- **Singleton**: `WebContainerManager` holds a static instance — only one WebContainer can exist per page. Never call `WebContainer.boot()` directly.
- **Cross-origin isolation required**: The host page must set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. See `apps/demo/vite.config.ts`.
- **iOS/iPadOS not supported**: `checkPlatformSupport()` in `stores.ts` detects and sets `$bootStatus = 'blocked'`.
- **`WebContainerProcess.kill()` returns `void`**, not `Promise<void>`.

### Template switching

`PlaygroundEngine.switchTemplate()` uses `TemplateManager.computeDiff()` to apply only changed files to the WebContainer filesystem (add/modify/remove). This avoids a full teardown/remount. Order matters:

1. Update `this.currentTemplate` **before** calling `installDependencies()` — the dep hash is computed from `this.currentTemplate`.
2. Call `preview.stop()` to kill the Vite process before rewriting files.
3. `FileSystemManager.removeFile()` uses `{ recursive: true, force: true }` — required for directories.

### React effect lifecycle (usePlayground)

Two effects with intentionally different dependency arrays:

- **Effect 1** `[template.id]`: Creates engine on first mount, calls `switchTemplate` on subsequent template changes, re-attaches event subscriptions. Cleanup only **unsubscribes** — never tears down the engine.
- **Effect 2** `[]`: Tears down the engine **only on component unmount**. Prevents the engine from being cleaned up mid-`switchTemplate`.

This split exists because `switchTemplate` is async; if Effect 1 tore down the engine, its cleanup would race with the in-flight switch.

### CodeMirror 6 — known constraints

- **`@codemirror/lang-vue@0.1.3`** is incompatible with the current `@lezer/common`. Its parse tree nodes lack `.children`, crashing any extension that calls `syntaxTree()`. `.vue` files fall back to the JS parser.
- **`bracketMatching()` and `autocompletion()`** both walk the Lezer tree synchronously during `dispatch()` and will crash on an uninitialized Vue/HTML grammar. Both are removed from `EditorController`.
- Language switching uses a `Compartment` + `dispatch()` (not `setState()`) to preserve undo history across file opens.
- The `initialize()` method is idempotent: if the view already exists, it re-attaches `view.dom` to the new container instead of creating a second instance (needed for template switches without `key` prop remounting).

### State management

All shared state lives in **Nanostores atoms** in `packages/core/src/state/stores.ts`. Mutations go through `playgroundActions` in `actions.ts` — direct `.set()` calls on atoms are fine inside the engine but actions are preferred for consistency.

React components read atoms with `useStore()` from `@nanostores/react`.

### Demo app — Vite alias configuration

`apps/demo/vite.config.ts` resolves workspace packages to their **TypeScript source** via `resolve.alias`, and excludes them from `optimizeDeps`. This prevents stale pre-bundled cache from running outdated engine code during development. Do not add workspace packages back to `optimizeDeps.include`.

### Formatting (Prettier browser build)

`PlaygroundEngine.formatCode()` uses Prettier's browser-compatible API. Each file extension maps to a specific parser + plugin set:

| Extension | Parser | Plugin |
|-----------|--------|--------|
| js/jsx/mjs/cjs | babel | babel + estree |
| ts/tsx | typescript | typescript + estree |
| html/htm | html | html |
| vue | vue | html |
| css/scss/less | css/scss/less | postcss |

### Console output bridging

Console output from the WebContainer iframe is captured by injecting a forwarder script into `/index.html` before Vite starts. The script intercepts `console.*` calls and posts structured messages to the parent window via `postMessage`. `PreviewServer` listens for these messages and emits `console:message` events.

## Testing Stack

- **Vitest** with `happy-dom` environment
- `@testing-library/react` + `@testing-library/jest-dom` for component tests
- `vitest.setup.ts` mocks `@webcontainer/api`, `localStorage`, `requestIdleCallback`, and CodeMirror view methods globally
- Tests live alongside source files in `packages/`, not in a separate `__tests__` directory

## Available Agents

The `.claude/skills/test-writer.md` skill generates tests for this codebase. Invoke it with: "write tests for [target]" or "use the test-writer agent".

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `Oluwasetemi/playground`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 20 issues identified in the code review — 6 critical, 8 important, 6 minor — across `packages/core`, `packages/react`, and `apps/demo`.

**Architecture:** Fixes are applied file-by-file across the monorepo. No new files are created; all changes are surgical edits to existing source files. The type deduplication fix (Issue 9) replaces `files: any` in `packages/templates/src/types.ts` with the proper `FileSystemTree` import.

**Tech Stack:** TypeScript, WebContainers API, CodeMirror 6, nanostores, React 18

---

## Files Modified

| File | Issues Fixed |
|------|-------------|
| `packages/core/src/preview/PreviewServer.ts` | 1, 4 |
| `packages/core/src/engine/PlaygroundEngine.ts` | 2, 3, 5, 7, 11 |
| `packages/core/src/editor/EditorController.ts` | 6, 8 |
| `packages/core/src/utils/virtualScroll.ts` | 12 |
| `packages/templates/src/types.ts` | 9 |
| `packages/react/src/usePlayground.ts` | 10 |
| `packages/react/src/components/PlaygroundTerminal.tsx` | 13 |
| `packages/react/src/components/ResizablePanel.tsx` | 15, 16 |
| `packages/react/src/components/PlaygroundPanel.tsx` | 17 |
| `packages/react/src/context/PlaygroundContext.tsx` | 20 |
| `apps/demo/src/App.tsx` | 14 |

---

## Task 1: Fix PreviewServer — accumulating listeners + origin security (Issues 1 & 4)

**Files:**
- Modify: `packages/core/src/preview/PreviewServer.ts`

- [ ] **Step 1: Store the `server-ready` unsubscribe and call it before re-registering**

  Replace the existing `start()` method and add a private field:

  ```ts
  // Add field after line 10 (after `private iframe: HTMLIFrameElement | null = null`):
  private serverReadyUnsubscribe: (() => void) | null = null
  private allowedOrigins: Set<string> = new Set()
  ```

  Replace `start()`:

  ```ts
  async start(command: string): Promise<void> {
    // Unsubscribe any previous listener before registering a new one
    this.serverReadyUnsubscribe?.()
    this.serverReadyUnsubscribe = this.webcontainer.on('server-ready', (_port, url) => {
      console.warn(`Preview server ready at: ${url}`)
      this.serverUrl = url
      // Track the origin of the server for postMessage security
      try {
        this.allowedOrigins.add(new URL(url).origin)
      }
      catch {
        // ignore malformed URL
      }
      this.events.emit('preview:ready', url)
      playgroundActions.setPreviewUrl(url)

      if (this.iframe) {
        this.iframe.src = url
      }
    })

    console.warn(`Starting preview server with command: ${command}`)
    const [cmd, ...args] = command.split(' ')

    const serverProcess = await this.webcontainer.spawn(cmd, args)

    serverProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.warn('[dev-server]', data)
        },
      }),
    )

    serverProcess.exit.then((code) => {
      if (code !== 0) {
        console.error(`Dev server exited with code ${code}`)
      }
    })
  }
  ```

- [ ] **Step 2: Add `event.origin` check in `setupMessageListener` (Issue 4)**

  Replace `setupMessageListener()`:

  ```ts
  private setupMessageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        // Only accept messages from known WebContainer server origins
        if (this.allowedOrigins.size > 0 && !this.allowedOrigins.has(event.origin)) {
          return
        }
        if (event.data && event.data.source === 'playground-console') {
          const message: ConsoleMessage = {
            type: event.data.type,
            args: event.data.args,
            timestamp: Date.now(),
          }
          this.events.emit('console:message', message)
        }
      })
    }
  }
  ```

- [ ] **Step 3: Use specific `targetOrigin` in `injectConsoleForwarder` (Issue 4)**

  In `injectConsoleForwarder()`, find the two `postMessage` calls that use `'*'`:

  ```ts
  // Replace both `}, '*');` with `}, window.location.origin);`
  ```

  Specifically, the injected script's `postMessage` cannot know the parent origin at inject time (it runs inside the iframe). The safe approach is to keep `'*'` inside the injected script (it runs in the iframe and the parent validates origin). But the `window.parent.postMessage` inside the iframe sandbox DOES need `'*'` because the parent origin is unknown from within the iframe. So only the listener side (step 2) needs validation — leave the injected script's `'*'` as is.

  The `window.parent.postMessage(..., '*')` in the injected script is unavoidable when the parent origin is unknown. The security fix is entirely on the receiving side (step 2).

- [ ] **Step 4: Verify the fix builds**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

  Expected: no errors in `PreviewServer.ts`

- [ ] **Step 5: Commit**

  ```bash
  git add packages/core/src/preview/PreviewServer.ts
  git commit -m "fix: prevent server-ready listener accumulation and validate postMessage origin"
  ```

---

## Task 2: Fix PlaygroundEngine — loadSnapshot silent, teardown, setTimeout leak, dep hash, snapshot path validation (Issues 2, 3, 5, 7, 11)

**Files:**
- Modify: `packages/core/src/engine/PlaygroundEngine.ts`

- [ ] **Step 1: Add `autoSaveSetupTimer` field and fix the leaked timer (Issue 5)**

  After `private installedDependenciesHash: string | null = null` (line 40), add:

  ```ts
  private autoSaveSetupTimer: ReturnType<typeof setTimeout> | null = null
  ```

  In `initialize()`, replace the `setTimeout` block (lines 114–120):

  ```ts
  if (this.options.autoSave) {
    this.autoSaveSetupTimer = setTimeout(() => {
      this.autoSaveSetupTimer = null
      if (this.filesystemManager && this.currentTemplate) {
        this.enableAutoSave()
      }
    }, 3000)
  }
  ```

  In `cleanup()`, add before `this.persistence.disableAutoSave()`:

  ```ts
  if (this.autoSaveSetupTimer !== null) {
    clearTimeout(this.autoSaveSetupTimer)
    this.autoSaveSetupTimer = null
  }
  ```

- [ ] **Step 2: Add `teardown()` call in `cleanup()` (Issue 3)**

  In `cleanup()`, replace:

  ```ts
  await this.webcontainerManager.killAll()
  ```

  with:

  ```ts
  await this.webcontainerManager.teardown()
  ```

  (`teardown()` already calls `killAll()` internally — see `WebContainerManager.ts:132`.)

- [ ] **Step 3: Fix `loadSnapshot` to use `{ silent: true }` and validate paths (Issues 2 & 7)**

  Replace the `loadSnapshot()` method:

  ```ts
  async loadSnapshot(): Promise<boolean> {
    const snapshot = await this.persistence.loadSnapshot()
    if (!snapshot || !this.filesystemManager) {
      return false
    }

    if (snapshot.templateId !== this.currentTemplate?.id) {
      console.warn('Snapshot template mismatch, ignoring')
      return false
    }

    // Only restore files that belong to the current template's expected paths
    // to prevent stale data from a prior template version leaking in.
    const expectedPaths = this.templateManager
      ? this.templateManager.getExpectedPaths(this.currentTemplate!)
      : null

    for (const [path, content] of Object.entries(snapshot.files)) {
      // Skip paths not in the template if we can validate them
      if (expectedPaths && !expectedPaths.has(path)) {
        console.warn(`Snapshot contains unexpected path, skipping: ${path}`)
        continue
      }
      // silent: true prevents triggering spurious file:change events
      await this.filesystemManager.writeFile(path, content, { silent: true })
    }

    for (const tab of snapshot.openTabs) {
      const content = snapshot.files[tab] || ''
      await this.editor.openFile(tab, content)
    }

    if (snapshot.activeFile) {
      const content = snapshot.files[snapshot.activeFile] || ''
      await this.editor.openFile(snapshot.activeFile, content)
    }

    return true
  }
  ```

- [ ] **Step 4: Fix dependency hash to use sorted keys (Issue 11)**

  Replace lines 592–594:

  ```ts
  function sortedKeys(obj: Record<string, string>) {
    return JSON.stringify(obj, Object.keys(obj).sort())
  }
  const combinedHash = sortedKeys(this.currentTemplate.dependencies)
    + sortedKeys(this.currentTemplate.devDependencies)
  ```

- [ ] **Step 5: Verify**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

  Expected: no errors in `PlaygroundEngine.ts`

- [ ] **Step 6: Commit**

  ```bash
  git add packages/core/src/engine/PlaygroundEngine.ts
  git commit -m "fix: teardown WebContainer on cleanup, fix silent snapshot writes, timer leak, and dep hash"
  ```

---

## Task 3: Fix EditorController — clearTimeout on destroy + language mode by extension (Issues 6 & 8)

**Files:**
- Modify: `packages/core/src/editor/EditorController.ts`

- [ ] **Step 1: Add imports for language extensions**

  Add after the existing `javascript` import (line 6):

  ```ts
  import { css } from '@codemirror/lang-css'
  import { html } from '@codemirror/lang-html'
  import { json } from '@codemirror/lang-json'
  ```

  Check what's available:

  ```bash
  cd /Users/oluwasetemi/r/playground && cat packages/core/package.json | grep codemirror
  ```

- [ ] **Step 2: Fix `destroy()` to clear pending debounce (Issue 6)**

  Replace `destroy()`:

  ```ts
  destroy(): void {
    if (this.updateTimeout !== null) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
    }
    if (this.view) {
      this.view.destroy()
      this.view = null
    }
    this.openTabs.clear()
    this.initialized = false
  }
  ```

- [ ] **Step 3: Implement language-aware `getLanguageExtension` (Issue 8)**

  Replace the `getLanguageExtension` inner function in `createBasicEditor()`:

  ```ts
  function getLanguageExtension(filePath: string = this.activeFile) {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    switch (ext) {
      case 'css':
        return css()
      case 'html':
      case 'htm':
        return html()
      case 'json':
        return json()
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
      default:
        return javascript({ jsx: true, typescript: true })
    }
  }
  ```

  And update the call site inside `extensions`:

  ```ts
  getLanguageExtension(this.activeFile),
  ```

- [ ] **Step 4: Verify**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/core/src/editor/EditorController.ts
  git commit -m "fix: clear debounce timer on destroy, add language mode detection by file extension"
  ```

---

## Task 4: Fix VirtualScrollManager scroll listener leak (Issue 12)

**Files:**
- Modify: `packages/core/src/utils/virtualScroll.ts`

- [ ] **Step 1: Store the scroll handler ref and remove it in `unmount()`**

  Add a private field after `private container`:

  ```ts
  private scrollHandler: (() => void) | null = null
  ```

  Replace `mount()`:

  ```ts
  mount(container: HTMLElement): void {
    this.container = container
    this.scrollHandler = () => {
      this.scrollTop = container.scrollTop
      this.render()
    }
    container.addEventListener('scroll', this.scrollHandler)
    this.render()
  }
  ```

  Replace `unmount()`:

  ```ts
  unmount(): void {
    if (this.container && this.scrollHandler) {
      this.container.removeEventListener('scroll', this.scrollHandler)
      this.scrollHandler = null
    }
    this.container = null
  }
  ```

- [ ] **Step 2: Verify**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add packages/core/src/utils/virtualScroll.ts
  git commit -m "fix: remove scroll listener on VirtualScrollManager unmount"
  ```

---

## Task 5: Fix type duplication — templates `files: any` (Issue 9)

**Files:**
- Modify: `packages/templates/src/types.ts`

- [ ] **Step 1: Replace `files: any` with the proper type**

  Replace entire file:

  ```ts
  import type { FileSystemTree } from '@webcontainer/api'

  export interface Template {
    id: string
    name: string
    description: string
    files: FileSystemTree
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
    commands: {
      dev: string
      build?: string
      test?: string
    }
    entryFile: string
    mainFile?: string
  }
  ```

- [ ] **Step 2: Verify `@webcontainer/api` is already a dep of templates**

  ```bash
  cat /Users/oluwasetemi/r/playground/packages/templates/package.json | grep webcontainer
  ```

  If not present, add it:

  ```bash
  cd /Users/oluwasetemi/r/playground/packages/templates && pnpm add @webcontainer/api
  ```

- [ ] **Step 3: Verify**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add packages/templates/src/types.ts packages/templates/package.json
  git commit -m "fix: use FileSystemTree instead of any for Template.files in templates package"
  ```

---

## Task 6: Fix usePlayground Strict Mode subscription leak (Issue 10)

**Files:**
- Modify: `packages/react/src/usePlayground.ts`

- [ ] **Step 1: Always clean up subscriptions, skip engine teardown when initializing**

  Replace the cleanup return inside the first `if (!engineRef.current)` block (lines 73–91):

  ```ts
  return () => {
    // Always unsubscribe events — subscriptions must not outlive this effect
    unsubscribeError()
    unsubscribeConsole()

    // Skip engine teardown if still initializing (React Strict Mode double-mount)
    if (initializingRef.current) {
      console.warn('Skipping engine cleanup - initialization still in progress')
      return
    }

    engine.saveSnapshot()
      .catch((err: Error) => {
        console.warn('Failed to save snapshot on cleanup:', err)
      })
      .finally(() => {
        engine.cleanup()
        engineRef.current = null
      })
  }
  ```

- [ ] **Step 2: Verify**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add packages/react/src/usePlayground.ts
  git commit -m "fix: always unsubscribe events in usePlayground cleanup, skip teardown during initialization"
  ```

---

## Task 7: Fix PlaygroundTerminal multiple mounts (Issue 13)

**Files:**
- Modify: `packages/react/src/components/PlaygroundTerminal.tsx`

- [ ] **Step 1: Track the mounted engine to avoid re-mounting**

  Replace entire file:

  ```tsx
  import { useEffect, useRef } from 'react'
  import { usePlaygroundContext } from '../context/PlaygroundContext'

  export function PlaygroundTerminal() {
    const { engine, status } = usePlaygroundContext()
    const containerRef = useRef<HTMLDivElement>(null)
    const mountedEngineRef = useRef<typeof engine>(null)

    useEffect(() => {
      if (
        containerRef.current
        && engine
        && status === 'ready'
        && mountedEngineRef.current !== engine
      ) {
        mountedEngineRef.current = engine
        engine.mountTerminal(containerRef.current)
      }

      // When engine changes, reset so the new engine gets mounted
      return () => {
        if (mountedEngineRef.current !== engine) {
          mountedEngineRef.current = null
        }
      }
    }, [engine, status])

    return (
      <div className="playground-terminal">
        <div className="terminal-header">Console</div>
        <div ref={containerRef} className="terminal-content" />
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add packages/react/src/components/PlaygroundTerminal.tsx
  git commit -m "fix: guard mountTerminal to only run once per engine instance"
  ```

---

## Task 8: Enable template selector in demo (Issue 14)

**Files:**
- Modify: `apps/demo/src/App.tsx`

- [ ] **Step 1: Remove `disabled` from the select element**

  Replace:

  ```tsx
  <select
    disabled
    value={selectedTemplate}
    onChange={e => setSelectedTemplate(e.target.value)}
  >
  ```

  With:

  ```tsx
  <select
    value={selectedTemplate}
    onChange={e => setSelectedTemplate(e.target.value)}
  >
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/demo/src/App.tsx
  git commit -m "fix: enable template selector in demo app"
  ```

---

## Task 9: Fix ResizablePanel — dead computed key + stale size in handleEnd (Issues 15 & 16)

**Files:**
- Modify: `packages/react/src/components/ResizablePanel.tsx`

- [ ] **Step 1: Fix the dead computed key in `resizerStyle` (Issue 15)**

  Replace:

  ```ts
  const resizerStyle: CSSProperties = {
    [isHorizontal ? 'width' : 'height']: '8px',
    [isHorizontal ? 'cursor' : 'cursor']: isHorizontal ? 'col-resize' : 'row-resize',
  ```

  With:

  ```ts
  const resizerStyle: CSSProperties = {
    [isHorizontal ? 'width' : 'height']: '8px',
    cursor: isHorizontal ? 'col-resize' : 'row-resize',
  ```

- [ ] **Step 2: Fix stale `size` in `handleEnd` by using a ref (Issue 16)**

  After `const [isDragging, setIsDragging] = useState(false)` add:

  ```ts
  const currentSizeRef = useRef(size)
  currentSizeRef.current = size
  ```

  In the `useEffect`, replace `handleEnd`:

  ```ts
  function handleEnd() {
    setIsDragging(false)
    dragStartRef.current = null
    const finalSize = currentSizeRef.current
    if (effectiveStorageKey) {
      localStorage.setItem(effectiveStorageKey, finalSize.toString())
    }
    onResizeEnd?.(finalSize)
  }
  ```

  Remove `size` from the useEffect dependency array (line 199):

  ```ts
  }, [isDragging, isHorizontal, clampSize, effectiveStorageKey, onResize, onResizeEnd])
  ```

- [ ] **Step 3: Verify**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add packages/react/src/components/ResizablePanel.tsx
  git commit -m "fix: correct resizerStyle computed key and eliminate stale size in handleEnd"
  ```

---

## Task 10: Fix PlaygroundPanel console message key (Issue 17)

**Files:**
- Modify: `packages/react/src/components/PlaygroundPanel.tsx`

- [ ] **Step 1: Replace index-based key with stable composite key**

  Replace:

  ```tsx
  consoleMessages.map((msg, index) => (
    <div key={index} className={`playground-console-message ${msg.type}`}>
  ```

  With:

  ```tsx
  consoleMessages.map((msg) => (
    <div key={`${msg.timestamp}-${msg.type}`} className={`playground-console-message ${msg.type}`}>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add packages/react/src/components/PlaygroundPanel.tsx
  git commit -m "fix: use stable composite key for console messages"
  ```

---

## Task 11: Fix PlaygroundContext template type (Issue 20)

**Files:**
- Modify: `packages/react/src/context/PlaygroundContext.tsx`

- [ ] **Step 1: Change `template: Template | null` to `template: Template`**

  Replace in `PlaygroundContextValue`:

  ```ts
  template: Template | null
  ```

  With:

  ```ts
  template: Template
  ```

- [ ] **Step 2: Verify**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1 | head -40
  ```

  If there are type errors in consumers (e.g. `Playground.tsx` passing a potentially-null template), trace and fix them.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/react/src/context/PlaygroundContext.tsx
  git commit -m "fix: narrow template context type from Template|null to Template"
  ```

---

## Task 12: Final build + typecheck verification

- [ ] **Step 1: Run full typecheck**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm typecheck 2>&1
  ```

  Expected: 0 errors

- [ ] **Step 2: Run build**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm build 2>&1
  ```

  Expected: successful build for all packages

- [ ] **Step 3: Run tests**

  ```bash
  cd /Users/oluwasetemi/r/playground && pnpm test:run 2>&1
  ```

  Expected: all tests pass

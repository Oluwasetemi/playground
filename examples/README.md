# Playground Core - Browser Examples

Simple HTML examples showing how to use `@setemiojo/playground-core` in the browser.

## ⚠️ Important

**WebContainers ONLY work in the browser**, not in Node.js. These examples must be served via HTTP, not opened as `file://`.

## Setup

1. Build the packages first:
```bash
cd /path/to/playground
pnpm build
```

2. Serve the examples with a local server:
```bash
# Using Python
python3 -m http.server 8000

# Or using Node.js
npx serve .

# Or using pnpm
pnpm dlx serve .
```

3. Open in browser:
```
http://localhost:8000/examples/vanilla-js.html
```

## Example: vanilla-js.html

A simple interactive example showing:
- Initializing the playground engine with different templates
- Switching between templates
- Reading files
- Updating files
- Event listening

### Features

**Buttons:**
- **Initialize Vanilla** - Start with vanilla JS template
- **Initialize React** - Start with React template
- **Switch to React** - Switch from current template to React
- **Switch to Vanilla** - Switch from current template to Vanilla
- **Read File** - Read the main file (`/main.js` or `/src/App.jsx`)
- **Update File** - Update the main file with new content
- **Clear Log** - Clear the console log

**Event Logging:**
- Status changes
- File updates
- Preview ready events
- Errors

## Basic Usage

```javascript
import { PlaygroundEngine } from '@setemiojo/playground-core'
import { vanillaTemplate, reactTemplate } from '@setemiojo/playground-templates'

// Create engine instance
const engine = new PlaygroundEngine({
  autoSave: false, // Optional: disable localStorage auto-save
})

// Listen to events
engine.on('status:change', (status) => {
  console.log('Status:', status)
})

engine.on('preview:ready', (url) => {
  console.log('Preview URL:', url)
})

// Initialize with a template
await engine.initialize(vanillaTemplate)

// Switch templates
await engine.switchTemplate(reactTemplate)

// File operations
const content = await engine.readFile('/src/App.jsx')
await engine.updateFile('/src/App.jsx', newContent)

// Cleanup when done
await engine.cleanup()
```

## Available Templates

```javascript
import {
  vanillaTemplate,  // Vanilla JS + Vite
  reactTemplate,    // React 19 + Vite
  vueTemplate,      // Vue 3 + Vite
  nodeTemplate,     // Node.js
} from '@setemiojo/playground-templates'
```

## Events

```javascript
// Status changes
engine.on('status:change', (status) => {
  // 'initializing' | 'installing' | 'ready' | 'error'
})

// File changes
engine.on('file:change', (path, content) => {})

// File tree updates
engine.on('files:update', (fileTree) => {})

// Preview ready
engine.on('preview:ready', (url) => {})

// Errors
engine.on('error', (error) => {})

// Console messages from preview
engine.on('console:message', (message) => {})
```

## API Quick Reference

```javascript
// Get current status
const status = engine.getStatus()

// Get current template
const template = engine.getCurrentTemplate()

// Get editor instance
const editor = engine.getEditor()

// File operations
await engine.readFile(path)
await engine.updateFile(path, content)

// Editor operations
await editor.openFile(path)
editor.setActiveFile(path)
editor.closeFile(path)
const tabs = editor.getOpenTabs()
const content = editor.getFileContent(path)
editor.updateFileContent(path, content)
```

## Troubleshooting

**Issue**: `WebContainer is not defined`
- **Solution**: Make sure you're accessing via HTTP (not `file://`). Use a local server.

**Issue**: CORS errors
- **Solution**: Serve from a proper HTTP server. The `file://` protocol won't work.

**Issue**: Module not found errors
- **Solution**: Run `pnpm build` first to build the packages.

**Issue**: Changes not reflecting in preview
- **Solution**: Wait for `status:change` event to be 'ready' before making changes.

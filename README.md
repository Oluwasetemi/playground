# Code Playground

A robust, framework-agnostic code playground component using WebContainers API from StackBlitz.

## Features

- Framework-agnostic core with React adapter
- Live code editing with CodeMirror 6
- Real-time preview with console output
- Support for vanilla JS, React, Vue, and Node.js projects
- File tree navigation
- Code persistence via localStorage
- Composable React components

## Packages

- `@playground/core` - Framework-agnostic playground engine
- `@playground/react` - React components and hooks
- `@playground/templates` - Project templates

## Getting Started

### Installation

```bash
npm install @playground/react @playground/core @playground/templates
# or
pnpm add @playground/react @playground/core @playground/templates
```

### Usage

```tsx
import { Playground, PlaygroundEditor, PlaygroundPreview, PlaygroundTerminal } from '@playground/react';
import { vanillaTemplate } from '@playground/templates';

function App() {
  return (
    <Playground template={vanillaTemplate}>
      <div className="playground-layout">
        <PlaygroundEditor />
        <PlaygroundPreview />
        <PlaygroundTerminal />
      </div>
    </Playground>
  );
}
```

### Requirements

WebContainers require cross-origin isolation headers:

```javascript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

## Development

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run demo app
cd apps/demo
pnpm dev
```

## License

MIT

# Playground - Claude Code Instructions

## Project Overview

A robust code playground using WebContainers API, built as a monorepo with:
- `@setemiojo/playground-core` - Framework-agnostic engine
- `@setemiojo/playground-react` - React components
- `@setemiojo/playground-templates` - Project templates

## Commands

```bash
pnpm dev          # Start development
pnpm build        # Build all packages
pnpm test         # Run tests (watch mode)
pnpm test:run     # Run tests once
pnpm test:coverage # Run tests with coverage
pnpm lint         # Lint code
pnpm typecheck    # Type check
```

## Available Agents

### Test Writer Agent

Use the test-writer agent to generate comprehensive tests for this codebase.

**Invocation**: Ask Claude to "write tests for [target]" or "use the test-writer agent"

**Capabilities**:
- Unit tests for core engine classes
- React component tests with Testing Library
- React hook tests
- Integration tests

**Example prompts**:
- "Write tests for the PlaygroundEngine class"
- "Add unit tests for TemplateCache"
- "Create component tests for PlaygroundHeader"
- "Write tests for the usePlayground hook"

The agent follows the guidelines in `.claude/skills/test-writer.md`.

## Testing Stack

- **Vitest** - Test runner
- **happy-dom** - DOM environment
- **@testing-library/react** - Component testing
- **@testing-library/jest-dom** - Custom matchers

## Key Files

- `vitest.config.ts` - Test configuration
- `vitest.setup.ts` - Test setup with mocks
- `.claude/skills/test-writer.md` - Test writing guidelines

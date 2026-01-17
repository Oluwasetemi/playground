# Publishing Guide

This monorepo uses **Changesets** for version management and publishing.

## Prerequisites

1. **npm Authentication**: Ensure you're logged in to npm
   ```bash
   npm login
   ```

2. **Build Packages**: Ensure all packages build successfully
   ```bash
   pnpm build
   ```

## Publishing Workflow

### 1. Create a Changeset

When you make changes to a package, create a changeset:

```bash
pnpm changeset
```

This will:
- Prompt you to select which packages changed
- Ask for the type of change (major, minor, patch)
- Request a summary of the changes

**Example workflow:**
```bash
# Make your changes to packages
git add .
git commit -m "feat: add new feature"

# Create changeset
pnpm changeset
# Select packages: @setemiojo/playground-core, @setemiojo/playground-react
# Select bump: minor
# Summary: "Add new feature to playground"

# Commit the changeset
git add .changeset/*.md
git commit -m "chore: add changeset"
git push
```

### 2. Version Packages

When ready to publish, update package versions:

```bash
pnpm version-packages
```

This will:
- Update package.json versions
- Update CHANGELOG.md files
- Consume changesets

```bash
git add .
git commit -m "chore: version packages"
git push
```

### 3. Publish to npm

```bash
pnpm release
```

This will:
- Build all packages
- Publish to npm registry
- Create git tags

### 4. Push Tags

```bash
git push --follow-tags
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm changeset` | Create a new changeset |
| `pnpm version-packages` | Update package versions |
| `pnpm release` | Build and publish packages |
| `pnpm build` | Build all packages |
| `pnpm changeset status` | Check changeset status |

## Package Dependencies

The packages have this dependency structure:

```
@setemiojo/playground-templates (standalone)
@setemiojo/playground-core (standalone)
@setemiojo/playground-react (depends on core)
```

Changesets will automatically handle internal dependencies.

## Best Practices

1. **Always create changesets** for user-facing changes
2. **Follow semantic versioning**:
   - `major` - Breaking changes
   - `minor` - New features
   - `patch` - Bug fixes
3. **Write clear changeset summaries** - they become your CHANGELOG
4. **Test before publishing** - run `pnpm build` and `pnpm test`
5. **Review versions** before running release

## Automation (Optional)

### GitHub Actions

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting

### "Package already published"
- Check npm registry: `npm view @setemiojo/playground-core`
- Ensure versions were bumped: `pnpm version-packages`

### "Build failed"
- Run `pnpm build` locally to debug
- Check TypeScript errors: `pnpm typecheck`

### "Authentication required"
- Run `npm login` and verify
- Check npm token: `npm whoami`

### "Workspace dependency not found"
- Ensure core package is built: `pnpm --filter @setemiojo/playground-core build`
- Check pnpm-workspace.yaml configuration

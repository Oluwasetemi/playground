import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile workspace packages from TypeScript source rather than dist/.
  // Module aliases are in tsconfig.json `paths` (read by Turbopack automatically).
  transpilePackages: [
    '@setemiojo/playground-core',
    '@setemiojo/playground-react',
    '@setemiojo/playground-templates',
  ],

  // WebContainers require cross-origin isolation on the host page.
  // require-corp matches the working Vite/Nuxt demo setup.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ]
  },

  // Explicitly set the monorepo root so Turbopack doesn't pick up the wrong
  // pnpm-lock.yaml from a parent directory, which breaks tsconfig path resolution.
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
}

export default nextConfig

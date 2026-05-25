import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile workspace packages from TypeScript source
  transpilePackages: [
    '@setemiojo/playground-core',
    '@setemiojo/playground-react',
    '@setemiojo/playground-templates',
  ],

  // WebContainers require cross-origin isolation on the host page
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

  webpack(config) {
    // Resolve workspace packages from their TypeScript source so webpack
    // compiles them directly — avoids stale dist/ artifacts during development.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@setemiojo/playground-core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@setemiojo/playground-react': path.resolve(__dirname, '../../packages/react/src/index.ts'),
      '@setemiojo/playground-templates': path.resolve(__dirname, '../../packages/templates/src/index.ts'),
      // Sub-path export for the playground stylesheet
      '@setemiojo/playground-react/styles': path.resolve(__dirname, '../../packages/react/src/styles/playground.css'),
    }
    return config
  },
}

export default nextConfig

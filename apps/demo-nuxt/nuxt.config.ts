import path from 'node:path'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  // WebContainers require cross-origin isolation on the host page
  routeRules: {
    '/**': {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
  },

  // Also set headers in the Vite dev server (routeRules only covers Nitro)
  vite: {
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    resolve: {
      // Resolve workspace packages from their TypeScript source directly,
      // matching the alias strategy used in the Vite demo app.
      alias: {
        '@setemiojo/playground-core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
        '@setemiojo/playground-react': path.resolve(__dirname, '../../packages/react/src/index.ts'),
        '@setemiojo/playground-templates': path.resolve(__dirname, '../../packages/templates/src/index.ts'),
        '@setemiojo/playground-react/styles': path.resolve(__dirname, '../../packages/react/src/styles/playground.css'),
      },
    },
    optimizeDeps: {
      exclude: [
        '@setemiojo/playground-core',
        '@setemiojo/playground-react',
        '@setemiojo/playground-templates',
      ],
    },
  },
})

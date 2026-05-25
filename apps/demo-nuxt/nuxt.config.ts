import path from 'node:path'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  // Include the playground stylesheet globally via Nuxt's CSS pipeline.
  // This avoids CSS @import inside a <style> block, which goes through
  // PostCSS (not Vite's module resolver) and mishandles package aliases.
  css: [
    path.resolve(__dirname, '../../packages/react/src/styles/playground.css'),
  ],

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
      // Use the array form so the more-specific /styles sub-path is matched
      // before the broader package alias. Object form uses prefix matching, so
      // '@setemiojo/playground-react' would swallow '@setemiojo/playground-react/styles'.
      alias: [
        {
          find: '@setemiojo/playground-react/styles',
          replacement: path.resolve(__dirname, '../../packages/react/src/styles/playground.css'),
        },
        {
          find: '@setemiojo/playground-core',
          replacement: path.resolve(__dirname, '../../packages/core/src/index.ts'),
        },
        {
          find: '@setemiojo/playground-react',
          replacement: path.resolve(__dirname, '../../packages/react/src/index.ts'),
        },
        {
          find: '@setemiojo/playground-templates',
          replacement: path.resolve(__dirname, '../../packages/templates/src/index.ts'),
        },
      ],
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

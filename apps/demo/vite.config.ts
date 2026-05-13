import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  resolve: {
    // Deduplicate React to ensure only one instance is used
    dedupe: ['react', 'react-dom'],
    // Resolve workspace packages from their TypeScript source so Vite
    // compiles them directly — this avoids stale pre-bundled cache entries
    // that persist even after rebuilding the packages' dist/ directories.
    alias: {
      '@setemiojo/playground-core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@setemiojo/playground-react': path.resolve(__dirname, '../../packages/react/src/index.ts'),
      '@setemiojo/playground-templates': path.resolve(__dirname, '../../packages/templates/src/index.ts'),
    },
  },
  optimizeDeps: {
    // Workspace packages are now resolved from source via alias above;
    // only pre-bundle their heavy third-party deps for faster startup.
    exclude: [
      '@setemiojo/playground-core',
      '@setemiojo/playground-react',
      '@setemiojo/playground-templates',
    ],
  },
  build: {
    // Ensure proper chunking to avoid duplicate React
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})

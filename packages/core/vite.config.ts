import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PlaygroundCore',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [],
      output: {
        // Manual chunking for code splitting
        manualChunks: {
          // Separate CodeMirror bundle
          editor: [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/commands',
            '@codemirror/search',
            '@codemirror/autocomplete',
            '@codemirror/language',
            '@codemirror/theme-one-dark',
          ],
          // Separate WebContainer bundle
          webcontainer: ['@webcontainer/api'],
        },
      },
    },
    // Enable minification and tree shaking
    minify: 'esbuild',
    target: 'esnext',
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 600,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  // Enable build optimizations
  esbuild: {
    treeShaking: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
})

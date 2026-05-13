import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        monaco: resolve(__dirname, 'src/monaco.ts'),
      },
      name: 'PlaygroundCore',
      formats: ['es'],
    },
    rollupOptions: {
      // Mark monaco-editor and all subpaths as external (optional peer dep)
      external: ['monaco-editor', /^monaco-editor\//, 'nanostores'],
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
            '@codemirror/lang-javascript',
            '@codemirror/lang-json',
            '@codemirror/lang-html',
            '@codemirror/lang-css',
            '@codemirror/lang-markdown',
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

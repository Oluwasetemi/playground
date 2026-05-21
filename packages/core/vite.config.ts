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
        codeSplitting: {
          groups: [
            { test: /@webcontainer\/api/, name: 'webcontainer' },
            { test: /@codemirror\//, name: 'editor' },
          ],
        },
      },
    },
    // Vite 8 uses Rolldown + OXC by default — minify: true enables OXC minifier
    minify: true,
    target: 'esnext',
    chunkSizeWarningLimit: 600,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
})

import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PlaygroundReact',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@nanostores/react',
        'nanostores',
        'monaco-editor',
        /^monaco-editor\//,
        '@setemiojo/playground-core',
      ],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    minify: true,
    target: 'esnext',
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
})

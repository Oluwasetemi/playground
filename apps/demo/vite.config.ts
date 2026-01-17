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
  },
  optimizeDeps: {
    // Include workspace packages for proper dependency optimization
    include: [
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

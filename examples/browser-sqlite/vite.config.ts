import { defineConfig } from 'vite';

export default defineConfig({
  build: {rollupOptions: {input: {main: 'index.html', orders: 'orders.html'}}},
  resolve: { preserveSymlinks: true },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});

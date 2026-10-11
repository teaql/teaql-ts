import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: { rollupOptions: { input: {
    main: 'index.html', workItems: 'work-items.html', orders: 'orders.html',
  } } },
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: /^teaql-ts$/, replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)) },
      { find: /^teaql-ts\/sql\/core$/, replacement: fileURLToPath(new URL('../../src/sql/core.ts', import.meta.url)) },
      { find: /^teaql-ts\/sql\/browser-sqlite$/, replacement: fileURLToPath(new URL('../../src/sql/browser-sqlite.ts', import.meta.url)) },
      { find: /^teaql-ts\/sql\/browser-sqlite-worker$/, replacement: fileURLToPath(new URL('../../src/sql/browser-sqlite-worker.ts', import.meta.url)) },
      { find: /^@sqlite\.org\/sqlite-wasm$/, replacement: fileURLToPath(new URL('./node_modules/@sqlite.org/sqlite-wasm/dist/index.mjs', import.meta.url)) },
    ],
  },
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

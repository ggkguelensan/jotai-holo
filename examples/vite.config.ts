import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      {
        find: 'jotai-holo/bunshi',
        replacement: fileURLToPath(new URL('../src/bunshi.ts', import.meta.url)),
      },
      {
        find: 'jotai-holo/vanilla',
        replacement: fileURLToPath(new URL('../src/vanilla.ts', import.meta.url)),
      },
      {
        find: 'jotai-holo',
        replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      },
    ],
  },
  build: { outDir: '../example-dist', emptyOutDir: true },
});

import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'jotai-holo/model',
        replacement: fileURLToPath(new URL('./src/model.ts', import.meta.url)),
      },
      {
        find: 'jotai-holo/query',
        replacement: fileURLToPath(new URL('./src/query.ts', import.meta.url)),
      },
      {
        find: 'jotai-holo/rhf',
        replacement: fileURLToPath(new URL('./src/rhf.ts', import.meta.url)),
      },
      {
        find: 'jotai-holo/bunshi',
        replacement: fileURLToPath(new URL('./src/bunshi.ts', import.meta.url)),
      },
      {
        find: 'jotai-holo/vanilla',
        replacement: fileURLToPath(new URL('./src/vanilla.ts', import.meta.url)),
      },
      {
        find: 'jotai-holo',
        replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      },
    ],
  },
  optimizeDeps: {
    include: [
      '@tanstack/react-query',
      '@tanstack/query-core',
      'react-hook-form',
      'react',
      'react-dom',
      'react-dom/client',
      'jotai',
      'jotai/utils',
      'jotai-effect',
      'bunshi/react',
      'jotai-scope',
      'jotai/react',
    ],
  },
  test: {
    include: ['tests/**/*.browser.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});

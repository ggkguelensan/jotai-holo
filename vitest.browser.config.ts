import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: {
    alias: [
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

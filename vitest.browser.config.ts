import { sourceAliases } from './scripts/source-aliases.js';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: {
    alias: sourceAliases(),
  },
  optimizeDeps: {
    include: [
      '@tanstack/react-query',
      '@hookform/resolvers/zod',
      'zod',
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

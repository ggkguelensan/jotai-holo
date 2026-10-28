import { sourceAliases } from './scripts/source-aliases.js';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { alias: sourceAliases() },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/**/*.browser.test.tsx', 'tests/**/*.compat.test.ts'],
  },
});

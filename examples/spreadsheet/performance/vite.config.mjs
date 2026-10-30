import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { sourceAliases } from '../../../scripts/source-aliases.js';
import { linguiMacros } from '../../../docs/.vitepress/i18n/macros.mjs';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias: sourceAliases() },
  plugins: [linguiMacros()],
  build: {
    outDir: '../../../.spreadsheet-performance',
    emptyOutDir: true,
    target: 'esnext',
  },
});

import { sourceAliases } from '../../scripts/source-aliases';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias: sourceAliases() },
  build: { outDir: '../../.vercel/graph-preview', emptyOutDir: true },
});

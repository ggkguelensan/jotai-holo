import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Never publish stale modules after an API or entry point is removed.
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)),
    '-p',
    fileURLToPath(new URL('../tsconfig.build.json', import.meta.url)),
  ],
  { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'inherit' },
);

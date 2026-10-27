import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Isolated fixture: no analytics SDK is added to the library's dependencies.
const root = resolve('.vercel/analytics-probe');
const { sdk, version } = JSON.parse(await readFile('design/analytics/validation.json', 'utf8'));
await mkdir(`${root}/src`, { recursive: true });
let installed;
try {
  installed = JSON.parse(
    await readFile(`${root}/node_modules/${sdk}/package.json`, 'utf8'),
  ).version;
} catch {}
if (installed !== version) {
  execFileSync(
    'npm',
    [
      'install',
      '--prefix',
      root,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      `${sdk}@${version}`,
    ],
    { stdio: 'inherit' },
  );
}
for (const file of ['protocol.ts', 'amplitude-adapter.ts', 'amplitude-adapter.test.ts']) {
  await copyFile(`design/analytics/${file}`, `${root}/src/${file}`);
}
execFileSync(
  'pnpm',
  [
    'exec',
    'tsc',
    '--noEmit',
    '--strict',
    '--target',
    'ES2022',
    '--module',
    'ESNext',
    '--moduleResolution',
    'Bundler',
    '--lib',
    'ES2022,DOM',
    '--skipLibCheck',
    `${root}/src/protocol.ts`,
    `${root}/src/amplitude-adapter.ts`,
    `${root}/src/amplitude-adapter.test.ts`,
  ],
  { stdio: 'inherit' },
);
await writeFile(
  `${root}/vitest.config.mjs`,
  `import { defineConfig } from 'vitest/config';
export default defineConfig({ root: ${JSON.stringify(root)}, test: { include: ['src/*.test.ts'] } });
`,
);
execFileSync('pnpm', ['exec', 'vitest', 'run', '--config', `${root}/vitest.config.mjs`], {
  stdio: 'inherit',
});
assert.equal(
  JSON.parse(await readFile(`${root}/node_modules/${sdk}/package.json`, 'utf8')).version,
  version,
);
console.log(`Draft adapter checked against ${sdk}@${version}; all runtime calls used a fake SDK.`);

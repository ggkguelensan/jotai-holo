import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Isolated type fixture. No SDK initialization and no analytics network traffic.
const root = resolve('.vercel/analytics-probe');
const { sdk, version } = JSON.parse(await readFile('design/analytics/validation.json', 'utf8'));
await mkdir(`${root}/src`, { recursive: true });
let installed;
try {
  installed = JSON.parse(
    await readFile(`${root}/node_modules/${sdk}/package.json`, 'utf8'),
  ).version;
} catch {}
if (installed !== version)
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
await writeFile(
  `${root}/src/check.ts`,
  `
import { createInstance } from '${sdk}';
import { createAmplitudeAdapter } from '../../../src/analytics-amplitude.js';
const client = createInstance();
createAmplitudeAdapter(client);
`,
);
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
    `${root}/src/check.ts`,
  ],
  { stdio: 'inherit' },
);
console.log(`Adapter types checked against ${sdk}@${version}; no SDK code executed.`);

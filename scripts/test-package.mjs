import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = fileURLToPath(new URL('../.package-test/', import.meta.url));
await rm(fixture, { recursive: true, force: true });
await mkdir(`${fixture}/node_modules/jotai-holo`, { recursive: true });
try {
  execFileSync('pnpm', ['pack', '--out', `${fixture}/library.tgz`], { cwd: root, stdio: 'pipe' });
  const listing = execFileSync('tar', ['-tzf', `${fixture}/library.tgz`], { encoding: 'utf8' });
  assert.match(listing, /package\/LICENSE/);
  assert.match(listing, /package\/dist\/index.d.ts/);
  assert.doesNotMatch(listing, /package\/(tests|examples|node_modules)\//);
  execFileSync('tar', [
    '-xzf',
    `${fixture}/library.tgz`,
    '--strip-components=1',
    '-C',
    `${fixture}/node_modules/jotai-holo`,
  ]);
  await writeFile(`${fixture}/package.json`, '{"type":"module"}\n');
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import * as library from 'jotai-holo';
    import * as vanilla from 'jotai-holo/vanilla';
    import { createStore } from 'jotai/vanilla';
    assert.deepEqual(Object.keys(library).sort(), ['actionAtom', 'holo', 'stateAtom']);
    assert.deepEqual(Object.keys(vanilla).sort(), ['actionAtom', 'stateAtom']);
    const value = vanilla.stateAtom(1);
    const increment = vanilla.actionAtom((_get, set) => set(value, n => n + 1));
    const store = createStore(); store.set(increment); assert.equal(store.get(value), 2);
  `,
    ],
    { cwd: fixture, stdio: 'inherit' },
  );
  await writeFile(
    `${fixture}/consumer.tsx`,
    `
    import { holo, stateAtom, actionAtom } from 'jotai-holo';
    import { stateAtom as vanillaStateAtom } from 'jotai-holo/vanilla';
    const count = stateAtom(0);
    const increment = actionAtom((_get, set, amount: number) => set(count, n => n + amount));
    const Counter = holo({
      core: (_props: { count: number; onIncrement: (amount: number) => void; title: string }) => null,
      state: { count }, actions: { onIncrement: increment },
    });
    const valid = <Counter title="counter" />;
    // @ts-expect-error A bound prop is not a caller prop.
    const invalid = <Counter title="counter" count={2} />;
    const derived = vanillaStateAtom(get => get(count) * 2);
    // @ts-expect-error Derived state is read-only.
    derived.write;
  `,
  );
  execFileSync(
    'pnpm',
    [
      'exec',
      'tsc',
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--target',
      'ES2022',
      '--jsx',
      'react-jsx',
      '.package-test/consumer.tsx',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  const packageManifest = JSON.parse(
    await readFile(`${fixture}/node_modules/jotai-holo/package.json`, 'utf8'),
  );
  assert.deepEqual(
    packageManifest.dependencies ?? {},
    {},
    'Core runtime must use only declared peers.',
  );
  const packed = `${fixture}/node_modules/jotai-holo/dist`;
  for (const file of ['holo.js', 'holo-cage.js']) {
    assert.match(await readFile(`${packed}/${file}`, 'utf8'), /^['"]use client['"]/);
  }
  for (const file of ['vanilla.js', 'state-atom.js', 'action-atom.js']) {
    const code = await readFile(`${packed}/${file}`, 'utf8');
    assert.doesNotMatch(code, /from ['"]react['"]|from ['"]jotai['"]|use client/);
  }
  console.log(
    'Packed ESM exports, consumer declarations, client directives and vanilla imports passed.',
  );
} finally {
  await rm(fixture, { recursive: true, force: true });
}

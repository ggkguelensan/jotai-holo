import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
    import * as bunshi from 'jotai-holo/bunshi';
    assert.deepEqual(Object.keys(bunshi), ['holoMolecule']);
    import { createStore } from 'jotai/vanilla';
    assert.deepEqual(Object.keys(library).sort(), ['actionAtom', 'bond', 'eventAtom', 'holo', 'holoList', 'holoMatch', 'ion', 'prism', 'stateAtom']);
    assert.deepEqual(Object.keys(vanilla).sort(), ['actionAtom', 'bond', 'eventAtom', 'ion', 'prism', 'stateAtom']);
    const value = vanilla.stateAtom(1);
    const increment = vanilla.actionAtom((_get, set) => set(value, n => n + 1));
    const store = createStore(); store.set(increment); assert.equal(store.get(value), 2);
    assert.equal(store.get(vanilla.ion(value, n => n * 2)), 4);
    assert.equal(store.get(vanilla.prism(value, { doubled: n => n * 2 }).doubled), 4);
    const requested = vanilla.eventAtom();
    let delivered = 0;
    const unsubscribe = requested.subscribe(store, () => { delivered++; });
    const link = vanilla.bond({ trigger: requested, yield: increment });
    const stop = link.connect(store); store.set(requested); stop(); assert.equal(store.get(value), 3); unsubscribe(); assert.equal(delivered, 1);
  `,
    ],
    { cwd: fixture, stdio: 'inherit' },
  );
  await writeFile(
    `${fixture}/consumer.tsx`,
    `
    import { holo, stateAtom, actionAtom, eventAtom, bond } from 'jotai-holo';
    import { stateAtom as vanillaStateAtom } from 'jotai-holo/vanilla';
    const renamed = eventAtom<string>();
    const stop = renamed.subscribe((await import('jotai/vanilla')).createStore(), value => { const name: string = value; void name; });
    const forwarding = bond({ trigger: renamed, map: name => [name.length] });
    stop(); void forwarding;
    const count = stateAtom(0);
    const increment = actionAtom((_get, set, amount: number) => set(count, n => n + amount));
    const Counter = holo({
      core: (_props: { count: number; onIncrement: (amount: number) => void; title: string }) => null,
      state: { count }, actions: { onIncrement: increment },
    });
    const valid = <Counter title="counter" />;
    const { holoMolecule } = await import('jotai-holo/bunshi');
    const { molecule } = await import('bunshi/react');
    const model = holoMolecule(molecule(() => ({ count, increment })));
    const Scoped = holo({
      core: (_props: { count: number; onIncrement: (amount: number) => void; title: string }) => null,
      state: { count: model(m => m.count) },
      actions: { onIncrement: model(m => m.increment) },
    });
    const scoped = <Scoped title="counter" />;
    // @ts-expect-error Selected state must match the View prop.
    holo({ core: (_props: { title: string }) => null, state: { title: model(m => m.count) } });

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
  assert.equal(packageManifest.exports['./bunshi'].import, './dist/bunshi.js');
  assert.equal(packageManifest.peerDependenciesMeta.bunshi.optional, true);
  const packed = `${fixture}/node_modules/jotai-holo/dist`;
  const visited = new Set();
  async function checkCoreGraph(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const code = await readFile(file, 'utf8');
    assert.doesNotMatch(code, /bunshi|holo-molecule/);
    for (const [, specifier] of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (!specifier.startsWith('.')) continue;
      const relative = file.endsWith('.d.ts') ? specifier.replace(/\.js$/, '.d.ts') : specifier;
      await checkCoreGraph(fileURLToPath(new URL(relative, pathToFileURL(file))));
    }
  }
  for (const entry of ['index.js', 'index.d.ts', 'vanilla.js', 'vanilla.d.ts']) {
    await checkCoreGraph(`${packed}/${entry}`);
  }
  assert.match(listing, /package\/dist\/bunshi\.d\.ts/);
  for (const file of [
    'holo.js',
    'holo-cage.js',
    'binding.js',
    'binding-state.js',
    'bunshi.js',
    'holo-list.js',
    'holo-match.js',
  ]) {
    assert.match(await readFile(`${packed}/${file}`, 'utf8'), /^['"]use client['"]/);
  }
  const vanillaVisited = new Set();
  async function checkVanillaGraph(file) {
    if (vanillaVisited.has(file)) return;
    vanillaVisited.add(file);
    const code = await readFile(file, 'utf8');
    assert.doesNotMatch(code, /from ['"]react(?:\/[^'"]*)?['"]|from ['"]jotai['"]|use client/);
    for (const [, specifier] of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (specifier.startsWith('.'))
        await checkVanillaGraph(fileURLToPath(new URL(specifier, pathToFileURL(file))));
    }
  }
  await checkVanillaGraph(`${packed}/vanilla.js`);
  console.log(
    'Packed ESM exports, consumer declarations, client directives and vanilla imports passed.',
  );
} finally {
  await rm(fixture, { recursive: true, force: true });
}

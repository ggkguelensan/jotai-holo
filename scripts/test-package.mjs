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
  assert.doesNotMatch(listing, /package\/(tests|examples|docs|node_modules)\//);
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
    import { createModel } from 'jotai-holo/model';
    import { persist, localStorageAdapter } from 'jotai-holo/persist';
    assert.equal(typeof persist, 'function');
    assert.equal(typeof localStorageAdapter, 'function');
    import { mutationAtoms, queryAtoms, queryClientAtom } from 'jotai-holo/query';
    import { QueryClient } from '@tanstack/query-core';
    import { createFormModel, formAtom, holoForm } from 'jotai-holo/rhf';
    assert.equal(typeof queryAtoms, 'function');
    assert.equal(typeof mutationAtoms, 'function');
    assert.equal(typeof holoForm, 'function');
    const definition = createModel({create: () => ({value: 1})});
    const forms = createFormModel({initial: {name: ''}, options: initial => ({defaultValues: initial})});
    import { createStore } from 'jotai/vanilla';
    assert.deepEqual(Object.keys(library).sort(), ['actionAtom', 'and', 'bond', 'eq', 'eventAtom', 'holo', 'holoList', 'holoMatch', 'ion', 'or', 'prism', 'some', 'stateAtom', 'subscribeEvent', 'sum', 'useImperativeHolo']);
    assert.deepEqual(Object.keys(vanilla).sort(), ['actionAtom', 'and', 'bond', 'eq', 'eventAtom', 'ion', 'or', 'prism', 'some', 'stateAtom', 'subscribeEvent', 'sum']);
    const value = vanilla.stateAtom(1);
    const increment = vanilla.actionAtom((_get, set) => set(value, n => n + 1));
    const store = createStore();
    assert.equal(store.get(definition()).value, 1);
    assert.equal(store.get(formAtom(store.get(forms()).form, 'name')), '');
    assert.equal(store.get(queryClientAtom), null);
    const client = new QueryClient({defaultOptions: {mutations: {gcTime: 0}}});
    const saving = mutationAtoms({client, mutation: () => ({mutationFn: async input => input + 1}), prism: {data: r => r.data}});
    assert.equal(await store.set(saving.mutate, 4), 5);
    assert.equal(store.get(saving.data), 5);
    client.clear();
    store.set(increment); assert.equal(store.get(value), 2);
    assert.equal(store.get(vanilla.ion(value, n => n * 2)), 4);
    assert.equal(store.get(vanilla.prism(value, { doubled: n => n * 2 }).doubled), 4);
    const requested = vanilla.eventAtom();
    let delivered = 0;
    const unsubscribe = vanilla.subscribeEvent(store, requested, () => { delivered++; });
    const link = vanilla.bond({ trigger: requested, yield: increment });
    const stop = link.connect(store); store.set(requested); stop(); assert.equal(store.get(value), 3); unsubscribe(); assert.equal(delivered, 1);
  `,
    ],
    { cwd: fixture, stdio: 'inherit' },
  );
  await writeFile(
    `${fixture}/consumer.tsx`,
    `
    import { holo, stateAtom, actionAtom, eventAtom, bond, subscribeEvent } from 'jotai-holo';
    import { stateAtom as vanillaStateAtom } from 'jotai-holo/vanilla';
    import { mutationAtoms } from 'jotai-holo/query';
    import { mutationOptions } from '@tanstack/react-query';
    import type { Atom } from 'jotai/vanilla';
    const saving = mutationAtoms({
      mutation: () => mutationOptions({mutationFn: async (input: {id: string}) => input.id}),
      prism: {data: r => r.data},
    });
    const projected: Atom<string | undefined> = saving.data;
    // @ts-expect-error The factory variables remain required in published declarations.
    (await import('jotai/vanilla')).createStore().set(saving.mutate);
    void projected;
    const renamed = eventAtom<string>();
    const stop = subscribeEvent((await import('jotai/vanilla')).createStore(), renamed, value => { const name: string = value; void name; });
    const forwarding = bond({ trigger: renamed, map: name => [name.length] });
    stop(); void forwarding;
    const count = stateAtom(0);
    const increment = actionAtom((_get, set, amount: number) => set(count, n => n + amount));
    const Counter = holo({
      view: (_props: { count: number; onIncrement: (amount: number) => void; title: string }) => null,
      read: { count }, write: { onIncrement: increment },
    });
    const valid = <Counter title="counter" />;
    const { createModel } = await import('jotai-holo/model');
    const definition = createModel({create: () => ({count, increment})});
    const Selected = holo({
      models: { counter: definition },
      view: (_props: {count: number; onIncrement: (amount: number) => void; title: string}) => null,
      read: ({ counter }) => ({ count: counter.count }),
      write: ({ counter }) => ({ onIncrement: counter.increment }),
    });
    const selected = <Selected title="counter" />;
    // @ts-expect-error Selected state must match the View prop.
    holo({models: {counter: definition}, view: (_props: {title: string}) => null, read: ({counter}) => ({title: counter.count})});

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
  assert.equal(packageManifest.exports['./bunshi'], undefined);
  assert.equal(packageManifest.peerDependencies.bunshi, undefined);
  assert.equal(packageManifest.peerDependenciesMeta['@tanstack/query-core'].optional, true);
  assert.equal(packageManifest.peerDependenciesMeta['react-hook-form'].optional, true);
  const packed = `${fixture}/node_modules/jotai-holo/dist`;
  const visited = new Set();
  async function checkCoreGraph(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const code = await readFile(file, 'utf8');
    assert.doesNotMatch(
      code,
      /bunshi|holo-molecule|react-hook-form|@tanstack\/query-core|from\s+['"]\.\/(?:model|query|rhf)\.js['"]/,
    );
    for (const [, specifier] of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (!specifier.startsWith('.')) continue;
      const relative = file.endsWith('.d.ts') ? specifier.replace(/\.js$/, '.d.ts') : specifier;
      await checkCoreGraph(fileURLToPath(new URL(relative, pathToFileURL(file))));
    }
  }
  for (const entry of ['index.js', 'index.d.ts', 'vanilla.js', 'vanilla.d.ts']) {
    await checkCoreGraph(`${packed}/${entry}`);
  }
  assert.doesNotMatch(
    listing,
    /package\/dist\/(?:bunshi|binding|holo-cage|model-binding|state-binding-atom)\./,
  );
  for (const file of [
    'holo.js',
    'holo-view.js',
    'imperative.js',
    'rhf.js',
    'binding-state.js',
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

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
    import * as modelApi from 'jotai-holo/model';
    import { modelRegistry, pipe, modelConnection } from 'jotai-holo/model';
    assert.deepEqual(Object.keys(modelApi).sort(), ['defineModel', 'modelConnection', 'modelLifecycle', 'modelRegistry', 'pipe']);
    import { createAnalytics, modelAnalytics } from 'jotai-holo/analytics';
    import { createAmplitudeAdapter } from 'jotai-holo/analytics/amplitude';
    assert.equal(typeof createAmplitudeAdapter, 'function');
    import { persist, localStorageAdapter } from 'jotai-holo/persist';
    assert.equal(typeof persist, 'function');
    assert.equal(typeof localStorageAdapter, 'function');
    import { createMutationModel, createQueryModel, queryClientAtom } from 'jotai-holo/query';
    import * as queryApi from 'jotai-holo/query';
    assert.deepEqual(Object.keys(queryApi).sort(), ['createMutationModel', 'createQueryModel', 'queryClientAtom']);
    import { QueryClient } from '@tanstack/query-core';
    import { createFormModel, formAtom, holoForm } from 'jotai-holo/rhf';
    assert.equal(typeof createQueryModel, 'function');
    assert.equal(typeof createMutationModel, 'function');
    assert.equal(typeof holoForm, 'function');
    const createValue = modelApi.defineModel(() => ({value: 1}));
    const definition = pipe(createValue, modelRegistry());
    const forms = modelRegistry()(createFormModel({initial: {name: ''}, options: initial => ({defaultValues: initial})}));
    import { createStore } from 'jotai/vanilla';
    assert.deepEqual(Object.keys(library).sort(), ['actionAtom', 'bond', 'eventAtom', 'holo', 'holoList', 'holoMatch', 'ion', 'prism', 'stateAtom', 'useHoloEvents']);
    assert.deepEqual(Object.keys(vanilla).sort(), ['actionAtom', 'bond', 'eventAtom', 'ion', 'prism', 'stateAtom']);

    const analyticsStore = createStore();
    let tracked = 0;
    const analytics = createAnalytics({engines:{recording:()=>({send(){tracked++}})}});
    const observed = pipe(
      () => ({occurred: vanilla.eventAtom()}),
      modelRegistry(),
      modelAnalytics(async () => model => ({
        observation: analytics.event({trigger:model.occurred,map:{recording:()=>({name:'occurred'})}}),
      })),
    );
    const lease = observed.acquire(analyticsStore);
    for(let i=0;i<20;i++) await Promise.resolve();
    analyticsStore.set(lease.model.occurred);
    await analytics.flush(analyticsStore);
    assert.equal(tracked, 1);
    lease.release();
    await analytics.dispose(analyticsStore);
    const value = vanilla.stateAtom(1);
    const increment = vanilla.actionAtom((_get, set) => set(value, n => n + 1));
    const store = createStore();
    assert.equal(store.get(definition()).value, 1);
    assert.equal(store.get(formAtom(store.get(forms()).form, 'name')), '');
    assert.equal(store.get(queryClientAtom), null);
    const client = new QueryClient({defaultOptions: {mutations: {gcTime: 0}}});
    const saving = createMutationModel({client, mutation: () => ({mutationFn: async input => input + 1}), prism: {data: r => r.data}});
    assert.equal(await store.set(saving.mutate, 4), 5);
    assert.equal(store.get(saving.data), 5);
    client.clear();
    store.set(increment); assert.equal(store.get(value), 2);
    assert.equal(store.get(vanilla.ion(value, n => n * 2)), 4);
    assert.equal(store.get(vanilla.prism(value, { doubled: n => n * 2 }).doubled), 4);
    const requested = vanilla.eventAtom();
    let delivered = 0;
    const unsubscribe = vanilla.bond({ trigger: requested, write: vanilla.actionAtom(() => { delivered++; }) }).connect(store);
    const link = vanilla.bond({ trigger: requested, write: increment });
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
    import { createMutationModel } from 'jotai-holo/query';
    import { mutationOptions } from '@tanstack/react-query';
    import type { Atom } from 'jotai/vanilla';
    const saving = createMutationModel({
      mutation: () => mutationOptions({mutationFn: async (input: {id: string}) => input.id}),
      prism: {data: r => r.data},
    });
    const projected: Atom<string | undefined> = saving.data;
    // @ts-expect-error The factory variables remain required in published declarations.
    (await import('jotai/vanilla')).createStore().set(saving.mutate);
    void projected;
    const renamed = eventAtom<string>();
    const stop = bond({ trigger: renamed, write: actionAtom((_get, _set, value: string) => { const name: string = value; void name; }) }).connect((await import('jotai/vanilla')).createStore());
    const forwarding = bond({ trigger: renamed, map: name => [name.length] });
    stop(); void forwarding;
    const count = stateAtom(0);
    const increment = actionAtom((_get, set, amount: number) => set(count, n => n + amount));
    const Counter = holo({
      view: (_props: { count: number; onIncrement: (amount: number) => void; title: string }) => null,
      read: { count }, write: { onIncrement: increment },
    });
    const valid = <Counter title="counter" />;
    const { modelRegistry, pipe } = await import('jotai-holo/model');
    const definition = pipe(() => ({count, increment}), modelRegistry());
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
  assert.deepEqual(
    Object.keys(packageManifest.exports).sort(),
    [
      '.',
      './vanilla',
      './model',
      './query',
      './rhf',
      './persist',
      './analytics',
      './analytics/amplitude',
      './package.json',
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(packageManifest.peerDependencies).sort(),
    ['react', 'jotai', 'react-hook-form', '@tanstack/query-core', '@types/react'].sort(),
  );
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
      /react-hook-form|@tanstack\/query-core|from\s+['"]\.\/(?:model|query|rhf)\.js['"]/,
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
    /package\/dist\/(?:binding|holo-cage|model-binding|state-binding-atom)\./,
  );
  for (const file of [
    'holo.js',
    'holo-view.js',
    'holo-events.js',
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

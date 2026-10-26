import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const fixture = `${root}/.bundle-size`;
const manifest = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
const shared = `
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { atom, Provider, useAtomValue, useSetAtom } from 'jotai';
function CounterView({ count, double, onIncrement, title }) {
  return h('button', { onClick: onIncrement }, title + ': ' + count + '/' + double);
}
`;
function app({ helpers, holo, preexistingUnwrap = false, molecule = false }) {
  if (molecule)
    return (
      shared +
      `
import { molecule, useMolecule } from 'bunshi/react';
import { holo } from '../../dist/index.js';
import { holoMolecule } from '../../dist/bunshi.js';
const Model = molecule(() => {
  const $count = atom(0);
  const $double = atom(get => get($count) * 2);
  const increment = atom(null, (_get, set) => { set($count, n => n + 1); });
  return { $count, $double, increment };
});
${
  holo
    ? `const counter = holoMolecule(Model);
const Counter = holo({ core: CounterView,
  state: { count: counter(m => m.$count), double: counter(m => m.$double) },
  actions: { onIncrement: counter(m => m.increment) }, bindProps: { title: 'Counter' },
});`
    : `function Counter() {
  const model = useMolecule(Model);
  const count = useAtomValue(model.$count);
  const double = useAtomValue(model.$double);
  const onIncrement = useSetAtom(model.increment);
  return h(CounterView, { count, double, onIncrement, title: 'Counter' });
}`
}
createRoot(document.getElementById('root')).render(h(Provider, null, h(Counter)));
`
    );

  return (
    shared +
    (helpers ? `import { stateAtom, actionAtom } from '../../dist/${helpers}.js';\n` : '') +
    (holo ? `import { holo } from '../../dist/index.js';\n` : '') +
    (preexistingUnwrap ? `import { unwrap } from 'jotai/vanilla/utils';\n` : '') +
    `
const $count = ${helpers ? 'stateAtom' : 'atom'}(0);
const $doubleBase = ${helpers ? 'stateAtom' : 'atom'}(get => get($count) * 2);
const $double = ${preexistingUnwrap ? 'unwrap($doubleBase)' : '$doubleBase'};
const increment = ${helpers ? 'actionAtom(' : 'atom(null, '}(_get, set) => { set($count, n => n + 1); });
${
  holo
    ? `const Counter = holo({ core: CounterView, state: { count: $count, double: $double }, actions: { onIncrement: increment }, bindProps: { title: 'Counter' } });`
    : `
function Counter() {
  const count = useAtomValue($count);
  const double = useAtomValue($double);
  const onIncrement = useSetAtom(increment);
  return h(CounterView, { count, double, onIncrement, title: 'Counter' });
}`
}
createRoot(document.getElementById('root')).render(h(Provider, null, h(Counter)));
`
  );
}
// Equivalent counter fixtures keep state, action and notification writes present
// in every variant; only the selected helper factories change.
function helperApp({ state = false, action = false, event = false, subscribe = false } = {}) {
  return (
    shared +
    `
import { createStore } from 'jotai/vanilla';
import { stateAtom, actionAtom, eventAtom, subscribeEvent } from '../dist/vanilla.js';
const store = createStore();
const $count = ${state ? 'stateAtom' : 'atom'}(0);
const $double = ${state ? 'stateAtom' : 'atom'}(get => get($count) * 2);
const occurred = ${event ? 'eventAtom()' : 'atom(null, () => {})'};
const increment = ${action ? 'actionAtom(' : 'atom(null, '}(_get, set) => {
  set($count, n => n + 1);
  set(occurred);
});
${
  subscribe
    ? `const stop = subscribeEvent(store, occurred, () => console.log('incremented'));
window.addEventListener('pagehide', stop, { once: true });`
    : ''
}
function Counter() {
  const count = useAtomValue($count);
  const double = useAtomValue($double);
  const onIncrement = useSetAtom(increment);
  return h(CounterView, { count, double, onIncrement, title: 'Counter' });
}
createRoot(document.getElementById('root')).render(h(Provider, { store }, h(Counter)));
`
  );
}
function sizes(code) {
  return {
    minified: Buffer.byteLength(code),
    gzip: gzipSync(code, { level: 9 }).byteLength,
    brotli: brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
      .byteLength,
  };
}
function inspect(result, allowBunshi = false) {
  const chunks = (Array.isArray(result) ? result : [result]).flatMap((output) =>
    output.output.filter((item) => item.type === 'chunk'),
  );
  assert.equal(chunks.length, 1, 'Fixture must produce exactly one JavaScript chunk.');
  const chunk = chunks[0];
  assert.ok(chunk);
  const modules = Object.entries(chunk.modules)
    .filter(([, info]) => info.renderedLength > 0)
    .map(([id]) => id);
  assert.ok(
    !modules.some((id) =>
      /node_modules\/(?:.*\/)?(?:jotai-effect|rxjs|jotai-eager)(?:@|\/)/.test(id),
    ),
    'Optional integrations must not enter the bundle.',
  );
  const bunshiIncluded = modules.some((id) => /node_modules\/(?:.*\/)?bunshi(?:@|\/)/.test(id));
  if (!allowBunshi) assert.equal(bunshiIncluded, false, 'Bunshi must stay outside core bundles.');
  return {
    bunshiIncluded,
    ...sizes(chunk.code),
    modules: modules
      .filter((id) => id.startsWith(`${root}/dist/`))
      .map((id) => id.slice(root.length + 1)),
  };
}
// Measurement-only transform: remove cage and its wiring without changing project sources.
function withoutCage() {
  return {
    name: 'measure-without-cage',
    enforce: 'pre',
    transform(code, id) {
      if (id !== `${root}/dist/holo.js`) return null;
      const branch = code.indexOf('    if (!cage ||');
      assert.ok(
        branch > 0 && code.includes('return WithCage;'),
        'Update the measurement transform for the new holo implementation.',
      );
      const head = code
        .slice(0, branch)
        .replace(/^import .*from ['"]\.\/holo-cage\.js['"];\n/m, '')
        .replace(/\bcage,\s*(?=})/, '');
      assert.ok(!head.includes('holo-cage.js'));
      return { code: `${head}    return Bound;\n}\n`, map: null };
    },
  };
}
const cases = [
  ['native', {}],
  ['native-molecule', { molecule: true }],
  ['holo-molecule', { molecule: true, holo: true }],
  ['helpers-root', { helpers: 'index' }],
  ['helpers-vanilla', { helpers: 'vanilla' }],
  ['holo', { holo: true }],
  ['holo-and-helpers', { holo: true, helpers: 'index' }],
  ['holo-without-cage', { holo: true, helpers: 'index', omitCage: true }],
  ['native-with-unwrap', { preexistingUnwrap: true }],
  ['holo-with-unwrap', { holo: true, helpers: 'index', preexistingUnwrap: true }],
];
const results = {};
const helperBreakdown = {};
const isolatedHelpers = {};
const optionalEntries = {};
try {
  await rm(fixture, { recursive: true, force: true });
  await mkdir(fixture, { recursive: true });
  for (const [name, options] of cases) {
    const entry = `${fixture}/main.js`;
    await writeFile(
      `${fixture}/index.html`,
      '<!doctype html><html><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>',
    );
    // main.js lives one level below the package, rather than two.
    await writeFile(entry, app(options).replaceAll('../../dist/', '../dist/'));
    const result = await build({
      configFile: false,
      root: fixture,
      logLevel: 'silent',
      mode: 'production',
      plugins: options.omitCage ? [withoutCage()] : [],
      build: {
        target: 'es2022',
        write: false,
        sourcemap: false,
        minify: 'oxc',
        modulePreload: false,
      },
    });
    results[name] = inspect(result, !!options.molecule);
  }
  const helperCases = [
    ['native', {}],
    ['stateAtom', { state: true }],
    ['actionAtom', { action: true }],
    ['eventAtom', { event: true }],
    ['stateAtom+actionAtom', { state: true, action: true }],
    ['all-three', { state: true, action: true, event: true }],
    ['all-three+subscribe', { state: true, action: true, event: true, subscribe: true }],
  ];
  for (const [name, options] of helperCases) {
    await writeFile(`${fixture}/main.js`, helperApp(options));
    const result = await build({
      configFile: false,
      root: fixture,
      logLevel: 'silent',
      mode: 'production',
      build: {
        target: 'es2022',
        write: false,
        sourcemap: false,
        minify: 'oxc',
        modulePreload: false,
      },
    });
    const measured = inspect(result);
    const baseline = helperBreakdown.native ?? measured;
    helperBreakdown[name] = {
      ...measured,
      delta: Object.fromEntries(
        ['minified', 'gzip', 'brotli'].map((metric) => [
          metric,
          measured[metric] - baseline[metric],
        ]),
      ),
    };
    assert.ok(!measured.modules.some((id) => /\/(?:holo|binding|bond|ion|prism)/.test(id)));
    if (!options.event) assert.ok(!measured.modules.includes('dist/event-atom.js'));
    assert.equal(
      measured.modules.includes('dist/event-dispatch.js'),
      !!options.subscribe,
      'Publishing helpers must exclude the delivery runtime.',
    );
    assert.equal(measured.modules.includes('dist/subscribe-event.js'), !!options.subscribe);
    if (!options.action && !options.event)
      assert.ok(!measured.modules.includes('dist/action-source.js'));
  }
  for (const [name, exports] of [
    ['stateAtom', ['stateAtom']],
    ['actionAtom', ['actionAtom']],
    ['eventAtom', ['eventAtom']],
    ['all-three', ['stateAtom', 'actionAtom', 'eventAtom']],
  ]) {
    const entry = `${fixture}/isolated.js`;
    await writeFile(entry, `export { ${exports.join(', ')} } from '../dist/vanilla.js';`);
    const result = await build({
      configFile: false,
      root,
      logLevel: 'silent',
      mode: 'production',
      build: {
        target: 'es2022',
        write: false,
        sourcemap: false,
        minify: 'oxc',
        rolldownOptions: {
          input: entry,
          preserveEntrySignatures: 'strict',
          external: (id) => /^(?:react|jotai)(?:\/|$)/.test(id),
        },
      },
    });
    isolatedHelpers[name] = inspect(result);
  }
  for (const [name, entry, names] of [
    ['scalar-operators', 'vanilla', ['eq', 'and', 'or', 'some', 'sum']],
    ['model', 'model', ['createModel']],
    ['query', 'query', ['queryAtoms', 'queryClientAtom']],
    ['rhf', 'rhf', ['createFormModel', 'holoForm', 'formAtom']],
    ['rhf-field', 'rhf', ['formAtom']],
    ['rhf-model', 'rhf', ['createFormModel']],
    ['rhf-binding', 'rhf', ['holoForm']],
  ]) {
    const input = `${fixture}/optional.js`;
    await writeFile(input, `export { ${names.join(', ')} } from '../dist/${entry}.js';`);
    const result = await build({
      configFile: false,
      root,
      logLevel: 'silent',
      mode: 'production',
      build: {
        target: 'es2022',
        write: false,
        minify: 'oxc',
        rolldownOptions: {
          input,
          preserveEntrySignatures: 'strict',
          external: (id) =>
            /^(?:react|jotai|react-hook-form|@tanstack\/query-core)(?:\/|$)/.test(id),
        },
      },
    });
    optionalEntries[name] = inspect(result);
  }
  assert.ok(
    !results.holo.modules.some((id) => /\/(?:model|query|rhf)\.js$/.test(id)),
    'Optional infrastructure must stay out of ordinary holo.',
  );
  const isolated = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    mode: 'production',
    build: {
      target: 'es2022',
      write: false,
      sourcemap: false,
      minify: 'oxc',
      rolldownOptions: {
        input: `${root}/dist/index.js`,
        preserveEntrySignatures: 'strict',
        external: (id) => /^(?:react|jotai)(?:\/|$)/.test(id),
      },
    },
  });
  results['library-peers-external'] = inspect(isolated);
  for (const key of ['helpers-root', 'helpers-vanilla']) {
    assert.ok(
      !results[key].modules.some((id) => /holo|state-binding/.test(id)),
      'Unused React adapter must be tree-shaken.',
    );
  }
  for (const key of ['helpers-root', 'helpers-vanilla', 'holo', 'holo-and-helpers']) {
    assert.ok(
      !results[key].modules.some((id) =>
        /\/(?:bond|event-atom|ion|prism|holo-list|holo-match)\.js$/.test(id),
      ),
      'Unused operators must be tree-shaken.',
    );
  }
  assert.ok(!results['holo-without-cage'].modules.some((id) => id.endsWith('/holo-cage.js')));
  assert.ok(results['holo-and-helpers'].modules.some((id) => id.endsWith('/holo-cage.js')));
  console.log(
    JSON.stringify(
      {
        source: process.env.BUNDLE_SOURCE_COMMIT ?? 'working tree',
        tooling: {
          vite: manifest.devDependencies.vite,
          react: manifest.devDependencies.react,
          jotai: manifest.devDependencies.jotai,
        },
        units: 'bytes; JS only; gzip level 9; Brotli quality 11',
        results,
        helperBreakdown,
        isolatedHelpers,
        optionalEntries,
        moleculeIncrement: Object.fromEntries(
          ['minified', 'gzip', 'brotli'].map((metric) => [
            metric,
            results['holo-molecule'][metric] - results['native-molecule'][metric],
          ]),
        ),
        cageIncrement: Object.fromEntries(
          ['minified', 'gzip', 'brotli'].map((metric) => [
            metric,
            results['holo-and-helpers'][metric] - results['holo-without-cage'][metric],
          ]),
        ),
        increments: Object.fromEntries(
          ['helpers-root', 'helpers-vanilla', 'holo', 'holo-and-helpers', 'holo-with-unwrap'].map(
            (name) => {
              const base = results[name === 'holo-with-unwrap' ? 'native-with-unwrap' : 'native'];
              return [
                name,
                Object.fromEntries(
                  ['minified', 'gzip', 'brotli'].map((metric) => [
                    metric,
                    results[name][metric] - base[metric],
                  ]),
                ),
              ];
            },
          ),
        ),
      },
      null,
      2,
    ),
  );
} finally {
  await rm(fixture, { recursive: true, force: true });
}

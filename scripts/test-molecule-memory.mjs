import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = `${root}.molecule-memory`;
let server;
let browser;
try {
  await mkdir(fixture, { recursive: true });
  await writeFile(
    `${fixture}/index.html`,
    '<div id="root"></div><script type="module" src="/main.js"></script>',
  );
  await writeFile(
    `${fixture}/main.js`,
    `
import { createElement as h, useEffect, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { atom, createStore, Provider, useAtomValue, useSetAtom } from 'jotai';
import { molecule, useMolecule, createScope, ScopeProvider, createInjector, InjectorProvider, onMount } from 'bunshi/react';
import { holo, useImperativeHolo, eventAtom } from '../dist/index.js';
import { holoMolecule } from '../dist/bunshi.js';
import { createModel } from '../dist/model.js';
const scope = createScope('default');
const injector = createInjector();
const injectorValue = () => injector;
const store = createStore();
const $shared = atom("shared");
let refs;
let active = 0;
let subscriptions = 0;
const Counter = molecule((_mol, getScope) => {
  getScope(scope);
  const $count = atom(0);
  const $pending = atom(new Promise(() => {}));
  $count.onMount = () => { subscriptions++; return () => { subscriptions--; }; };
  const increment = atom(null, (_get, set) => set($count, n => n + 1));
  const model = { $count, $pending, increment };
  refs.models.push(new WeakRef(model));
  refs.atoms.push(new WeakRef($count), new WeakRef($pending));
  onMount(() => { active++; return () => { active--; }; });
  return model;
});
const counter = holoMolecule(Counter);
function View({ count, increment }) {
  useEffect(() => { refs.callbacks.push(new WeakRef(increment)); }, [increment]);
  return h('button', { onClick: increment }, count);
}
const Adapted = holo({ core: View, state: { shared: $shared, count: counter(m => m.$count) }, actions: { increment: counter(m => m.increment) } });
const AdaptedPending = holo({ core: View, state: { shared: $shared, count: counter(m => m.$pending) }, actions: { increment: counter(m => m.increment) } });
function Native({ pending }) {
  const model = useMolecule(Counter);
  const count = useAtomValue(pending ? model.$pending : model.$count);
  const increment = useSetAtom(model.increment);
  return h(View, { count, increment });
}
const OwnModel = createModel({
  gcTime: 0,
  create: () => {
    const $count = atom(0);
    const $pending = atom(new Promise(() => {}));
    $count.onMount = () => { subscriptions++; return () => { subscriptions--; }; };
    const increment = atom(null, (_get, set) => set($count, n => n + 1));
    const model = { $count, $pending, increment, changed: eventAtom() };
    refs.models.push(new WeakRef(model)); refs.atoms.push(new WeakRef($count), new WeakRef($pending));
    return model;
  },
  connect: () => { active++; return () => { active--; }; },
});
const Own = holo({ model: props => OwnModel({key: [props.instanceKey]}), core: View, state: m => ({count: m.$count}), actions: m => ({increment: m.increment}) });
const OwnPending = holo({ model: props => OwnModel({key: [props.instanceKey]}), core: View, state: m => ({count: m.$pending}), actions: m => ({increment: m.increment}) });
const OwnDefault = createModel({
  retainTime: Infinity,
  create: () => {
    const $count = atom(0);
    const $pending = atom(new Promise(() => {}));
    $count.onMount = () => { subscriptions++; return () => { subscriptions--; }; };
    const increment = atom(null, (_get, set) => set($count, n => n + 1));
    const model = { $count, $pending, increment, changed: eventAtom() };
    refs.models.push(new WeakRef(model)); refs.atoms.push(new WeakRef($count), new WeakRef($pending));
    return model;
  },
});
function ImperativeView({ count, increment, imperative }) {
  useImperativeHolo(imperative, { changed() { increment(); } });
  useEffect(() => { refs.callbacks.push(new WeakRef(increment)); }, [increment]);
  return h('button', { onClick: increment }, count);
}
const Modern = holo({ models: { counter: props => OwnModel({ key: [props.instanceKey] }) }, view: ImperativeView, read: ({ counter }) => ({ shared: $shared, count: counter.$count }), write: ({ counter }) => ({ increment: counter.increment }), imperative: ({ counter }) => ({ changed: counter.changed }) });
const ModernPending = holo({ models: { counter: props => OwnModel({ key: [props.instanceKey] }) }, view: ImperativeView, read: ({ counter }) => ({ shared: $shared, count: counter.$pending }), write: ({ counter }) => ({ increment: counter.increment }), imperative: ({ counter }) => ({ changed: counter.changed }) });
const ModernDefault = holo({ models: { counter: OwnDefault }, view: ImperativeView, read: ({ counter }) => ({ shared: $shared, count: counter.$count }), write: ({ counter }) => ({ increment: counter.increment }), imperative: ({ counter }) => ({ changed: counter.changed }) });
const ModernDefaultPending = holo({ models: { counter: OwnDefault }, view: ImperativeView, read: ({ counter }) => ({ shared: $shared, count: counter.$pending }), write: ({ counter }) => ({ increment: counter.increment }), imperative: ({ counter }) => ({ changed: counter.changed }) });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
window.samples = {};
window.run = async (mode, cycles) => {
  refs = { models: [], atoms: [], callbacks: [] };
  const root = createRoot(document.getElementById('root'));
  const pending = mode.endsWith('-suspended');
  const Page = mode.startsWith('default-') ? (pending ? ModernDefaultPending : ModernDefault) : mode.startsWith('modern') ? (pending ? ModernPending : Modern) : mode.startsWith('own') ? (pending ? OwnPending : Own) : mode.startsWith('adapted') ? (pending ? AdaptedPending : Adapted) : Native;
  for (let i = 0; i < cycles; i++) {
    flushSync(() => root.render(
      h(InjectorProvider, { value: injectorValue },
        h(Provider, { store: mode.startsWith('default-') ? createStore() : store }, h(ScopeProvider, { scope, value: mode + ':' + i },
          h(Suspense, { fallback: 'pending' }, h(Page, { pending, instanceKey: mode + ':' + i })))))
    ));
    await tick();
    flushSync(() => root.render(null));
    await tick();
  }
  flushSync(() => root.unmount());
  await tick();
  window.samples[mode] = refs;
  return { created: refs.models.length, callbacks: refs.callbacks.length, active, subscriptions };
};
window.retained = mode => Object.fromEntries(Object.entries(window.samples[mode]).map(([key, values]) => [key, values.filter(ref => ref.deref() !== undefined).length]));
window.ready = true;
`,
  );
  await build({
    configFile: false,
    root: fixture,
    logLevel: 'silent',
    build: { outDir: 'output', emptyOutDir: true, target: 'es2022' },
  });
  server = await preview({
    configFile: false,
    root: fixture,
    logLevel: 'silent',
    build: { outDir: 'output' },
    preview: { host: '127.0.0.1', port: 0 },
  });
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => window.ready === true);
  const cdp = await page.context().newCDPSession(page);
  const report = {};
  for (const mode of [
    'native',
    'adapted',
    'native-suspended',
    'adapted-suspended',
    'own',
    'own-suspended',
    'modern',
    'modern-suspended',
    'default-discarded-store',
    'default-discarded-store-suspended',
  ]) {
    const lifecycle = await page.evaluate(({ mode, cycles }) => window.run(mode, cycles), {
      mode,
      cycles: 200,
    });
    assert.ok(lifecycle.created >= 200, 'Experiment must actually construct scoped models.');
    assert.equal(lifecycle.active, 0);
    assert.equal(lifecycle.subscriptions, 0);
    for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
    const retained = await page.evaluate((mode) => window.retained(mode), mode);
    report[mode] = { ...lifecycle, retained };
    assert.deepEqual(retained, { models: 0, atoms: 0, callbacks: 0 }, JSON.stringify(report));
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { mode: 'production React + Chromium forced GC', cyclesPerCase: 200, report },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => (server ? server.httpServer.close(resolve) : resolve()));
  await rm(fixture, { recursive: true, force: true });
}

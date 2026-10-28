import assert from 'node:assert/strict';
import { createStore, atom } from 'jotai/vanilla';
import { modelRegistry, modelLifecycle, pipe } from '../dist/model.js';
import { createAnalytics, modelAnalytics } from '../dist/analytics.js';
import { eventAtom } from '../dist/vanilla.js';

assert.equal(typeof global.gc, 'function', 'Run with --expose-gc.');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
async function collect(refs) {
  for (let i = 0; i < 8; i++) {
    await tick();
    global.gc();
  }
  return refs.filter((ref) => ref.deref() !== undefined).length;
}
const cases = {};
for (const mode of [
  'retained-discarded-store',
  'evicted-parent',
  'pending-feature',
  'pending-data',
]) {
  const refs = [];
  const analytics = createAnalytics({ engines: { recording: () => ({ send() {} }) } });
  let connected = 0;
  function create() {
    const model = { happened: eventAtom(), $value: atom('') };
    refs.push(new WeakRef(model));
    return model;
  }
  const observe = modelAnalytics(async () => (model) => {
    connected++;
    return {
      observed: analytics.event({
        trigger: model.happened,
        map: { recording: () => ({ name: 'happened' }) },
      }),
    };
  });
  const $$model =
    mode === 'pending-feature'
      ? pipe(
          create,
          modelAnalytics(() => new Promise(() => {})),
          modelRegistry({ retainTime: 0 }),
        )
      : mode === 'pending-data'
        ? pipe(
            create,
            modelLifecycle({
              load: () => new Promise(() => {}),
              restore: (model) => model.$value,
              snapshot: (model) => model.$value,
            }),
            modelRegistry({ retainTime: 0 }),
          )
        : pipe(
            create,
            observe,
            modelRegistry({ retainTime: mode === 'evicted-parent' ? 0 : Infinity }),
          );
  const shared = createStore();
  async function cycle(store, key) {
    let owner = $$model.acquire(store, { key: [key] });
    await tick();
    owner.release();
    owner = undefined;
  }
  for (let i = 0; i < 300; i++) {
    let store = mode === 'retained-discarded-store' ? createStore() : shared;
    await cycle(store, i);
    store = undefined;
  }
  await tick();
  const retained = await collect(refs);
  assert.equal(retained, 0, `${mode}: retained model records`);
  cases[mode] = { cycles: refs.length, retained, connected };
}
{
  const refs = [];
  const $$initial = pipe((initial) => {
    refs.push(new WeakRef(initial));
    return initial;
  }, modelRegistry());
  const store = createStore();
  for (let i = 0; i < 300; i++) store.get($$initial({ key: [i], initial: { value: i } }));
  const retained = await collect(refs);
  assert.equal(retained, 0, 'Unowned initial data must not keep its own model alive.');
  cases['abandoned-initial-data'] = { cycles: refs.length, retained };
}
{
  const shared = { happened: eventAtom() };
  const refs = [];
  const analytics = createAnalytics({ engines: { recording: () => ({ send() {} }) } });
  const $$model = pipe(
    () => shared,
    modelRegistry({ retainTime: 0 }),
    modelAnalytics(() => (model) => {
      const child = {
        observed: analytics.event({ trigger: model.happened, map: { recording: () => ({}) } }),
      };
      refs.push(new WeakRef(child));
      return child;
    }),
  );
  const store = createStore();
  function cycle(key) {
    const owner = $$model.acquire(store, { key: [key] });
    owner.release();
  }
  for (let i = 0; i < 300; i++) cycle(i);
  const retained = await collect(refs);
  assert.equal(refs.length, 300);
  assert.equal(
    retained,
    0,
    'Evicted keys must release children even if the parent record is globally shared.',
  );
  cases['shared-record-evicted-children'] = { cycles: refs.length, retained };
}
console.log(JSON.stringify(cases, null, 2));

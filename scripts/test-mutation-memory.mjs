import assert from 'node:assert/strict';
import { QueryClient, MutationObserver } from '@tanstack/query-core';
import { createStore } from 'jotai/vanilla';
import { createMutationModel } from '../dist/query.js';

assert.equal(typeof global.gc, 'function', 'Run with node --expose-gc.');
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
async function collect() {
  for (let i = 0; i < 10; i++) {
    await pause();
    global.gc();
  }
}
const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
const store = createStore();
const observers = [];
const subscribe = MutationObserver.prototype.subscribe;
MutationObserver.prototype.subscribe = function (...args) {
  observers.push(new WeakRef(this));
  return subscribe.apply(this, args);
};
const results = [];
function definition() {
  return createMutationModel({
    client,
    mutation: () => ({
      mutationFn: async (id) => {
        const result = { id, payload: new Uint8Array(1024) };
        results.push(new WeakRef(result));
        return result;
      },
    }),
    prism: { $data: (r) => r.data },
  });
}
const retained = definition();
async function run(executor, id) {
  const stop = store.sub(executor.$data, () => {});
  const pending = store.set(executor.mutate, id);
  stop();
  await pending;
}
try {
  for (let i = 0; i < 300; i++) await run(retained, i);
  await collect();
  assert.equal(client.getMutationCache().getAll().length, 0);
  assert.equal(results.filter((ref) => ref.deref()).length, 1, 'Keep only the latest snapshot.');
  assert.ok(
    observers.every((ref) => !ref.deref()?.hasListeners()),
    'Release listeners after calls.',
  );
  store.set(retained.reset);
  await collect();
  assert.equal(results.filter((ref) => ref.deref()).length, 0, 'Reset releases the latest result.');
  for (let i = 0; i < 200; i++) await run(definition(), i);
  await collect();
  assert.equal(
    results.filter((ref) => ref.deref()).length,
    0,
    'Discarded adapters release results.',
  );
  const shared = definition();
  const stores = [];
  async function temporaryStore() {
    const temporary = createStore();
    stores.push(new WeakRef(temporary));
    await temporary.set(shared.mutate, 1);
  }
  for (let i = 0; i < 100; i++) await temporaryStore();
  await collect();
  assert.equal(
    stores.filter((ref) => ref.deref()).length,
    0,
    'Shared adapters do not retain stores.',
  );
  console.log(
    'Mutation memory: 600 calls; history, reset results, discarded adapters/stores and listeners released.',
  );
} finally {
  MutationObserver.prototype.subscribe = subscribe;
  client.clear();
}

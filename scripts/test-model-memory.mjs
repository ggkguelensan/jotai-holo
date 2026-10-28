import assert from 'node:assert/strict';
import { atom, createStore } from 'jotai/vanilla';
import { pipe, modelRegistry, modelConnection } from '../dist/model.js';
import { createFormModel, formAtom } from '../dist/rhf.js';

assert.equal(typeof global.gc, 'function', 'Run with node --expose-gc.');
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
async function collect() {
  for (let i = 0; i < 8; i++) {
    await pause();
    global.gc();
  }
  await pause();
}
const store = createStore();
let refs = [];
let active = 0;
const definition = (retainTime) =>
  pipe(
    () => {
      const model = { $value: atom(0) };
      refs.push(new WeakRef(model));
      return model;
    },
    modelRegistry({ retainTime }),
    modelConnection(() => {
      active++;
      return () => {
        active--;
      };
    }),
  );
const counts = () => refs.filter((ref) => ref.deref()).length;
const report = {};
const provisional = definition(Infinity);
for (let i = 0; i < 300; i++) store.get(provisional({ key: [i] }));
await collect();
assert.equal(counts(), 0, 'Abandoned reads must not retain model objects.');
report.abandonedReads = counts();
refs = [];
const finite = definition(0);
for (let i = 0; i < 300; i++) finite.acquire(store, { key: [i] }).release();
await collect();
assert.equal(counts(), 0, 'Released finite models must be collected.');
report.releasedFinite = counts();
refs = [];
const permanent = definition(Infinity);
for (let i = 0; i < 300; i++) permanent.acquire(store, { key: [i] }).release();
await collect();
assert.equal(counts(), 300, 'Infinity intentionally retains committed instances.');
report.retainedInfinity = counts();
for (let i = 0; i < 300; i++) permanent.remove(store, { key: [i] });
await collect();
assert.equal(counts(), 0, 'Explicit removal must release retained instances.');
report.removedInfinity = counts();
refs = [];
function discardedStore() {
  const temporary = createStore();
  for (let i = 0; i < 300; i++) permanent.acquire(temporary, { key: [i] }).release();
  refs.push(new WeakRef(temporary));
}
discardedStore();
await collect();
assert.equal(counts(), 0, 'Registry and models must die with their store.');
report.discardedStore = counts();
refs = [];
const forms = modelRegistry({ retainTime: 0 })(
  createFormModel({
    initial: { name: '' },
    options: (initial) => ({ defaultValues: initial }),
    model: ({ form }) => {
      refs.push(new WeakRef(form));
      return { $name: formAtom(form, 'name') };
    },
  }),
);
function exerciseForms() {
  for (let i = 0; i < 300; i++) {
    const lease = forms.acquire(store, { key: [i] });
    const stop = store.sub(lease.model.$name, () => {});
    stop();
    lease.release();
  }
}
exerciseForms();
await collect();
assert.equal(counts(), 0, 'Removed form controls must be collected after subscriptions detach.');
report.releasedForms = counts();
assert.equal(active, 0);
console.log(
  JSON.stringify({ cyclesPerCase: 300, activeResources: active, retained: report }, null, 2),
);

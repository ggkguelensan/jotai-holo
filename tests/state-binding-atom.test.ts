import { atom, createStore } from 'jotai/vanilla';
import { expect, test } from 'vitest';
import { createStateBindingAtom } from '../src/state-binding-atom.js';

test('one raw snapshot retains its result identity through resolution', async () => {
  let resolve: (value: undefined) => void = () => undefined;
  const source = atom(
    new Promise<undefined>((done) => {
      resolve = done;
    }),
  );
  const count = atom(0);
  const aggregate = createStateBindingAtom([
    ['value', source],
    ['count', count],
  ]);
  const store = createStore();
  const stop = store.sub(aggregate, () => undefined);
  const pending = store.get(aggregate);
  resolve(undefined);
  await pending;
  expect(store.get(aggregate)).toBe(pending);
  store.set(count, 1);
  const ready = store.get(aggregate);
  expect(ready).not.toBeInstanceOf(Promise);
  expect(ready).toEqual({ value: undefined, count: 1 });
  stop();
});

test('late subscription retains the suspended snapshot', async () => {
  let resolve: (value: undefined) => void = () => undefined;
  const source = atom(
    new Promise<undefined>((done) => {
      resolve = done;
    }),
  );
  const count = atom(0);
  const aggregate = createStateBindingAtom([
    ['value', source],
    ['count', count],
  ]);
  const store = createStore();
  const pending = store.get(aggregate);
  resolve(undefined);
  await pending;
  expect(store.get(aggregate)).toBe(pending);
  const stop = store.sub(aggregate, () => undefined);
  expect(store.get(aggregate)).toBe(pending);
  stop();
});

test('stores sharing one promise still own separate aggregate snapshots', async () => {
  const source = atom(Promise.resolve(5));
  const count = atom(0);
  const aggregate = createStateBindingAtom([
    ['value', source],
    ['count', count],
  ]);
  const first = createStore();
  const second = createStore();
  second.set(count, 10);
  const a = first.get(aggregate);
  const b = second.get(aggregate);
  expect(a).not.toBe(b);
  expect(await a).toEqual({ value: 5, count: 0 });
  expect(await b).toEqual({ value: 5, count: 10 });
  first.set(count, 1);
  expect(first.get(aggregate)).toEqual({ value: 5, count: 1 });
  expect(await second.get(aggregate)).toEqual({ value: 5, count: 10 });
});

test('a fulfilled promise remains synchronous after many unrelated sync snapshot changes', async () => {
  const source = atom(Promise.resolve(5));
  const count = atom(0);
  let reads = 0;
  const independent = atom(() => {
    reads++;
    return 7;
  });
  const aggregate = createStateBindingAtom([
    ['value', source],
    ['count', count],
    ['independent', independent],
  ]);
  const store = createStore();
  const stop = store.sub(aggregate, () => undefined);
  await store.get(aggregate);
  for (let index = 1; index <= 100; index++) {
    store.set(count, index);
    expect(store.get(aggregate)).toEqual({ value: 5, count: index, independent: 7 });
  }
  expect(reads).toBe(1);
  stop();
});

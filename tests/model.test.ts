import { createStore } from 'jotai/vanilla';
import { afterEach, expect, test, vi } from 'vitest';
import { createModel } from '../src/model.js';
import { actionAtom, bond, eventAtom, stateAtom } from '../src/vanilla.js';

afterEach(() => vi.useRealTimers());

function createCounter(initial = 0) {
  const $count = stateAtom(initial);
  const increment = actionAtom((_get, set) => set($count, (value) => value + 1));
  return { $count, increment };
}

test('definition and selection are lazy; default models and values belong to a store', () => {
  const create = vi.fn(() => createCounter());
  const model = createModel({ create });
  const selected = model();
  expect(model()).toBe(selected);
  expect(create).not.toHaveBeenCalled();
  const a = createStore();
  const b = createStore();
  const first = a.get(selected);
  expect(a.get(selected)).toBe(first);
  expect(b.get(selected)).not.toBe(first);
  a.set(first.increment);
  expect(a.get(first.$count)).toBe(1);
  expect(b.get(b.get(selected).$count)).toBe(0);
});

test('structural keys are stable, namespaces are independent, and reads do not connect resources', () => {
  const connect = vi.fn();
  const first = createModel({ create: () => createCounter(), connect });
  const second = createModel({ create: () => createCounter() });
  const store = createStore();
  const a = store.get(first({ key: [{ a: 1, b: 2 }] }));
  expect(store.get(first({ key: [{ b: 2, a: 1 }] }))).toBe(a);
  expect(store.get(first({ key: [{ a: 2, b: 1 }] }))).not.toBe(a);
  expect(store.get(second({ key: [{ a: 1, b: 2 }] }))).not.toBe(a);
  expect(connect).not.toHaveBeenCalled();
});

test('initial is creation-only and does not reset a shared keyed model', () => {
  const model = createModel({ initial: 0, create: createCounter });
  const store = createStore();
  const first = model.acquire(store, { key: ['editor'], initial: 5 });
  store.set(first.model.increment);
  const second = model.acquire(store, { key: ['editor'], initial: 100 });
  expect(second.model).toBe(first.model);
  expect(store.get(second.model.$count)).toBe(6);
  first.release();
  second.release();
});

test('Infinity retains acquired state while releasing connections after the final owner', () => {
  const connect = vi.fn(() => vi.fn());
  const model = createModel({ create: () => createCounter(), connect });
  const store = createStore();
  const a = model.acquire(store, { key: ['shared'] });
  const b = model.acquire(store, { key: ['shared'] });
  expect(connect).toHaveBeenCalledTimes(1);
  store.set(a.model.increment);
  a.release();
  expect(connect.mock.results[0]!.value).not.toHaveBeenCalled();
  b.release();
  expect(connect.mock.results[0]!.value).toHaveBeenCalledTimes(1);
  a.release();
  expect(connect.mock.results[0]!.value).toHaveBeenCalledTimes(1);
  const again = model.acquire(store, { key: ['shared'] });
  expect(again.model).toBe(a.model);
  expect(store.get(again.model.$count)).toBe(1);
  expect(connect).toHaveBeenCalledTimes(2);
  again.release();
});

test('removal refuses active models and invalidates an existing selection after release', () => {
  const model = createModel({ create: () => createCounter() });
  const store = createStore();
  const selected = model({ key: ['one'] });
  const lease = model.acquire(store, { key: ['one'] });
  expect(model.remove(store, { key: ['one'] })).toBe(false);
  lease.release();
  expect(model.remove(store, { key: ['one'] })).toBe(true);
  expect(store.get(selected)).not.toBe(lease.model);
});

test('finite retention cancels eviction on reacquisition and never evicts another store', () => {
  vi.useFakeTimers();
  const model = createModel({ create: () => createCounter(), gcTime: 100 });
  const a = createStore();
  const b = createStore();
  const first = model.acquire(a, { key: ['one'] });
  const other = model.acquire(b, { key: ['one'] });
  const original = first.model;
  first.release();
  vi.advanceTimersByTime(50);
  const again = model.acquire(a, { key: ['one'] });
  expect(again.model).toBe(original);
  vi.advanceTimersByTime(100);
  expect(a.get(model({ key: ['one'] }))).toBe(original);
  again.release();
  vi.advanceTimersByTime(101);
  expect(a.get(model({ key: ['one'] }))).not.toBe(original);
  expect(b.get(model({ key: ['one'] }))).toBe(other.model);
  other.release();
  vi.runAllTimers();
});

test('gcTime zero releases a keyed instance after the current task', () => {
  vi.useFakeTimers();
  const model = createModel({ create: () => createCounter(), gcTime: 0 });
  const store = createStore();
  const selected = model({ key: ['one'] });
  const first = model.acquire(store, { key: ['one'] });
  expect(store.get(selected)).toBe(first.model);
  first.release();
  expect(store.get(selected)).toBe(first.model);
  vi.runAllTimers();
  expect(store.get(selected)).not.toBe(first.model);
});

test('model connections share one bond and dispose it without cancelling unrelated owners', () => {
  const requested = eventAtom<number>();
  const model = createModel({
    create: () => {
      const $value = stateAtom(0);
      return { $value, link: bond({ trigger: requested, yield: $value }) };
    },
    connect: (model, store) => model.link.connect(store),
  });
  const store = createStore();
  const first = model.acquire(store);
  const second = model.acquire(store);
  store.set(requested, 1);
  first.release();
  store.set(requested, 2);
  expect(store.get(second.model.$value)).toBe(2);
  second.release();
  store.set(requested, 3);
  expect(store.get(second.model.$value)).toBe(2);
});

test('a failed connection does not poison ownership and can be retried', () => {
  const connect = vi.fn(() => {
    if (connect.mock.calls.length === 1) throw new Error('failed');
    return () => {};
  });
  const model = createModel({ create: () => createCounter(), connect });
  const store = createStore();
  expect(() => model.acquire(store)).toThrow('failed');
  const lease = model.acquire(store);
  lease.release();
  expect(connect).toHaveBeenCalledTimes(2);
});

test('keys reject unsupported values, cycles and non-finite numbers', () => {
  const model = createModel({ create: () => createCounter() });
  expect(() => model({ key: [NaN] })).toThrow('unsupported');
  expect(() => model({ key: [new Date() as never] })).toThrow('unsupported');
  const cycle: unknown[] = [];
  cycle.push(cycle);
  expect(() => model({ key: cycle as never })).toThrow('cycle');
  expect(() => createModel({ create: () => ({}), retainTime: -1 })).toThrow('retainTime');
});

function typeChecks() {
  // @ts-expect-error Model factories are synchronous; async work belongs in actions/resources.
  createModel({ create: async () => ({ value: 1 }) });
  // @ts-expect-error Connect returns a synchronous disposer, not an async lifecycle promise.
  createModel({ create: () => ({}), connect: async () => {} });
}
void typeChecks;

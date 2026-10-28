import { createStore } from 'jotai/vanilla';
import { expect, test, vi } from 'vitest';
import { acquireResources } from '../src/resource.js';
import { createModel } from '../src/model-registry.js';

test('resource identity shares ownership per store and reconnects after the last release', () => {
  const stop = vi.fn();
  const connect = vi.fn(() => stop);
  const resource = { connect };
  const a = createStore();
  const b = createStore();
  const first = acquireResources(a, [resource]);
  const second = acquireResources(a, [resource]);
  const other = acquireResources(b, [resource]);
  expect(connect).toHaveBeenCalledTimes(2);
  first();
  first();
  expect(stop).not.toHaveBeenCalled();
  second();
  expect(stop).toHaveBeenCalledTimes(1);
  other();
  expect(stop).toHaveBeenCalledTimes(2);
  acquireResources(a, [resource])();
  expect(connect).toHaveBeenCalledTimes(3);
});

test('acquisition rollback and reverse cleanup attempt every resource despite errors', () => {
  const calls: string[] = [];
  const a = {
    connect() {
      return () => {
        calls.push('a');
      };
    },
  };
  const b = {
    connect() {
      return () => {
        calls.push('b');
        throw new Error('cleanup');
      };
    },
  };
  const failure = {
    connect() {
      throw new Error('connect');
    },
  };
  expect(() => acquireResources(createStore(), [a, b, failure])).toThrow(AggregateError);
  expect(calls).toEqual(['b', 'a']);
});

test('model resources activate once per ownership period while retainTime preserves state', () => {
  const connect = vi.fn(() => vi.fn());
  const create = vi.fn(() => ({ id: Math.random() }));
  const model = createModel({ create, resources: () => [{ connect }], retainTime: Infinity });
  const store = createStore();
  const a = model.acquire(store);
  const b = model.acquire(store);
  expect(a.model).toBe(b.model);
  expect(connect).toHaveBeenCalledTimes(1);
  a.release();
  expect(connect.mock.results[0]!.value).not.toHaveBeenCalled();
  b.release();
  expect(connect.mock.results[0]!.value).toHaveBeenCalledTimes(1);
  const c = model.acquire(store);
  expect(c.model).toBe(a.model);
  expect(connect).toHaveBeenCalledTimes(2);
  c.release();
  expect(model.remove(store)).toBe(true);
  const d = model.acquire(store);
  expect(d.model).not.toBe(a.model);
  d.release();
});

test('retainTime expires unused keyed models and reacquisition cancels eviction', async () => {
  vi.useFakeTimers();
  try {
    const model = createModel({ create: () => ({}), retainTime: 20 });
    const store = createStore();
    const a = model.acquire(store, { key: ['a'] });
    a.release();
    await vi.advanceTimersByTimeAsync(10);
    const b = model.acquire(store, { key: ['a'] });
    expect(b.model).toBe(a.model);
    await vi.advanceTimersByTimeAsync(30);
    expect(store.get(model({ key: ['a'] }))).toBe(a.model);
    b.release();
    await vi.advanceTimersByTimeAsync(20);
    expect(store.get(model({ key: ['a'] }))).not.toBe(a.model);
  } finally {
    vi.useRealTimers();
  }
});

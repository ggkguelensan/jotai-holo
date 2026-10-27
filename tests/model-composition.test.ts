import { createStore } from 'jotai/vanilla';
import { expect, test, vi } from 'vitest';
import { createModel } from '../src/model.js';
import { stateAtom } from '../src/vanilla.js';

test('reading a dependent model during connect does not acquire its resources', () => {
  const connectChild = vi.fn();
  const Child = createModel({
    create: () => ({ $value: stateAtom(0) }),
    resources: (model) => [{ connect: (store) => connectChild() }],
  });
  const Parent = createModel({
    create: () => ({ $child: Child() }),
    resources: (model) => [
      {
        connect: (store) => {
          store.get(model.$child);
        },
      },
    ],
  });
  const store = createStore();
  const parent = Parent.acquire(store);
  expect(store.get(parent.model.$child)).toBe(store.get(Child()));
  expect(connectChild).not.toHaveBeenCalled();
  parent.release();
});

test('explicit dependency leases share one connection and release after the final parent', () => {
  const cleanup = vi.fn();
  const connectChild = vi.fn(() => cleanup);
  const Child = createModel({
    create: () => ({ $value: stateAtom(0) }),
    resources: (model) => [{ connect: (store) => connectChild() }],
  });
  const Parent = createModel({
    initial: { childId: 'default' },
    create: (initial) => ({ childId: initial.childId }),
    resources: (model) => [
      {
        connect: (store) => {
          const child = Child.acquire(store, { key: ['child', model.childId] });
          return child.release;
        },
      },
    ],
  });
  const store = createStore();
  const first = Parent.acquire(store, { key: ['editor'], initial: { childId: 'shared' } });
  const second = Parent.acquire(store, { key: ['toolbar'], initial: { childId: 'shared' } });
  expect(connectChild).toHaveBeenCalledTimes(1);
  first.release();
  expect(cleanup).not.toHaveBeenCalled();
  second.release();
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test('failed parent setup cannot roll back a dependency lease it was not told about', () => {
  const cleanup = vi.fn();
  const Child = createModel({
    create: () => ({}),
    resources: (_model) => [{ connect: (_store) => cleanup }],
  });
  let releaseChild: (() => void) | undefined;
  const Parent = createModel({
    create: () => ({}),
    resources: (_model) => [
      {
        connect: (store) => {
          releaseChild = Child.acquire(store).release;
          throw new Error('parent setup failed');
        },
      },
    ],
  });
  const store = createStore();
  try {
    expect(() => Parent.acquire(store)).toThrow('parent setup failed');
    expect(cleanup).not.toHaveBeenCalled();
    expect(Child.remove(store)).toBe(false);
  } finally {
    // Application setup must roll this back itself with the current contract.
    releaseChild?.();
  }
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(Child.remove(store)).toBe(true);
});

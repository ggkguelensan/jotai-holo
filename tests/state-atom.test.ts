import { createStore, type Atom, type Getter, type PrimitiveAtom, type Setter } from 'jotai';
import { expect, expectTypeOf, test } from 'vitest';

import { actionAtom } from '../src/action-atom.js';
import { stateAtom } from '../src/state-atom.js';

test('creates state writable through actions and read-only derived state', () => {
  const $count = stateAtom(0);
  const $doubled = stateAtom(function read(get: Getter, ...extra: unknown[]) {
    expect(extra).toEqual([]);
    return get($count) * 2;
  });
  const increment = actionAtom((_get, set) => set($count, (count) => count + 1));
  const store = createStore();

  expectTypeOf($count).toEqualTypeOf<PrimitiveAtom<number>>();
  expectTypeOf($doubled).toEqualTypeOf<Atom<number>>();
  expect(store.get($doubled)).toBe(0);
  store.set(increment);
  expect(store.get($doubled)).toBe(2);
  expect($doubled).not.toHaveProperty('write');
});

test('preserves async state and read-only async derivation', async () => {
  const $count = stateAtom(Promise.resolve(3));
  const $doubled = stateAtom(async (get) => (await get($count)) * 2);
  const store = createStore();

  expectTypeOf($count).toEqualTypeOf<PrimitiveAtom<Promise<number>>>();
  expectTypeOf($doubled).toEqualTypeOf<Atom<Promise<number>>>();
  await expect(store.get($doubled)).resolves.toBe(6);
});

// Compile-only checks keep write handlers and extra read arguments out of this API.
function _checkStateAtomBoundary() {
  const $count = stateAtom(0);
  const $doubled = stateAtom((get) => get($count) * 2);
  // @ts-expect-error Derived state cannot be written to.
  createStore().set($doubled, 4);
  // @ts-expect-error State atoms do not accept write handlers.
  stateAtom(0, (_get: Getter, _set: Setter) => undefined);
  stateAtom(
    (get: Getter) => get($count),
    // @ts-expect-error Derived state does not accept write handlers.
    (_get: Getter, _set: Setter) => undefined,
  );
  // @ts-expect-error A derived read receives only get, never set.
  stateAtom((_get: Getter, _set: Setter) => 1);
  // @ts-expect-error Jotai read options are not part of the stateAtom read callback.
  stateAtom((_get: Getter, _options: { signal: AbortSignal }) => 1);
  stateAtom<{ id: number } | null>(null);
  stateAtom<number | undefined>(undefined);
}

test('function-valued derived results are values rather than nested atom reads', () => {
  const callback = (value: number) => value + 1;
  const $callback = stateAtom(() => callback);
  expect(createStore().get($callback)).toBe(callback);
});

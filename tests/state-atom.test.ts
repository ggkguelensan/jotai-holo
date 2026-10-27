import { atom, createStore, type Atom, type Getter, type Setter } from 'jotai';
import { expect, expectTypeOf, test } from 'vitest';
import { stateAtom } from '../src/state-atom.js';

test('stateAtom preserves the complete native atom contract without a runtime wrapper', () => {
  expect(stateAtom).toBe(atom);
  expectTypeOf(stateAtom).toEqualTypeOf<typeof atom>();
  const $count = stateAtom(0);
  const $doubled = stateAtom((get) => get($count) * 2);
  const store = createStore();
  expectTypeOf($doubled).toEqualTypeOf<Atom<number>>();
  expect(store.get($doubled)).toBe(0);
  store.set($count, 2);
  expect(store.get($doubled)).toBe(4);
  expect($doubled).not.toHaveProperty('write');
});

test('writable derivations preserve independent read/write types and write results', () => {
  const $count = stateAtom(1);
  const $formatted = stateAtom(
    (get) => String(get($count)),
    (_get, set, value: number) => {
      set($count, value);
      return value * 2;
    },
  );
  const store = createStore();
  expect(store.set($formatted, 3)).toBe(6);
  expect(store.get($formatted)).toBe('3');
});

test('async derivation receives native AbortSignal and function-valued results stay values', async () => {
  let signal: AbortSignal | undefined;
  const $count = stateAtom(Promise.resolve(3));
  const $doubled = stateAtom(async (get, options) => {
    signal = options.signal;
    return (await get($count)) * 2;
  });
  const store = createStore();
  await expect(store.get($doubled)).resolves.toBe(6);
  expect(signal).toBeInstanceOf(AbortSignal);
  const callback = (value: number) => value + 1;
  expect(store.get(stateAtom(() => callback))).toBe(callback);
});

function typeChecks() {
  const $count = stateAtom(0);
  const $derived = stateAtom((get) => get($count));
  // @ts-expect-error A read-only derivation remains read-only.
  createStore().set($derived, 4);
  const read = (_get: Getter, _set: Setter) => 1;
  // @ts-expect-error A derived read receives native read options, never a Setter.
  const invalid: Atom<number> = stateAtom(read);
  void invalid;
}
void typeChecks;

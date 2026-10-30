import { atom, createStore, type Atom, type WritableAtom } from 'jotai/vanilla';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { flatMapAtom, matchAtom, ion, stateAtom } from '../src/vanilla.js';

test('flatMapAtom switches dependencies and mounts only the selected atom', () => {
  const left = atom(1);
  const right = atom(2);
  const mountLeft = vi.fn(() => unmountLeft);
  const unmountLeft = vi.fn();
  const mountRight = vi.fn(() => unmountRight);
  const unmountRight = vi.fn();
  left.onMount = mountLeft;
  right.onMount = mountRight;
  const mode = atom(false);
  const selected = flatMapAtom(mode, (value) => (value ? right : left));
  const store = createStore();
  const notify = vi.fn();
  const stop = store.sub(selected, notify);
  expect(mountLeft).toHaveBeenCalledTimes(1);
  expect(mountRight).not.toHaveBeenCalled();
  store.set(mode, true);
  expect(store.get(selected)).toBe(2);
  expect(unmountLeft).toHaveBeenCalledTimes(1);
  expect(mountRight).toHaveBeenCalledTimes(1);
  notify.mockClear();
  store.set(left, 9);
  expect(notify).not.toHaveBeenCalled();
  stop();
  expect(unmountRight).toHaveBeenCalledTimes(1);
});

test('flatMapAtom writes to the current target without a subscription and preserves arguments/results', async () => {
  const left = atom(1);
  const right = atom(2);
  const mode = atom(false);
  const target = (value: typeof left) =>
    atom(
      (get) => get(value),
      (get, set, amount: number, multiplier: number) => {
        set(value, get(value) + amount * multiplier);
        return Promise.resolve(get(value));
      },
    );
  const a = target(left);
  const b = target(right);
  const selected = flatMapAtom(mode, (value) => (value ? b : a));
  expectTypeOf(selected).toEqualTypeOf<WritableAtom<number, [number, number], Promise<number>>>();
  const store = createStore();
  expect(store.get(selected)).toBe(1);
  store.set(mode, true);
  await expect(store.set(selected, 3, 4)).resolves.toBe(14);
  expect(store.get(left)).toBe(1);
  expect(store.get(right)).toBe(14);
});

test('flatMapAtom supports record/tuple sources and remains store-local', () => {
  const a = atom(1);
  const b = atom(2);
  const targets = atom({ a, b });
  const key = atom<'a' | 'b'>('a');
  const record = flatMapAtom({ targets, key }, (value) => value.targets[value.key]);
  const tuple = flatMapAtom([targets, key], ([value, name]) => value[name]);
  const left = createStore();
  const right = createStore();
  left.set(key, 'b');
  left.set(record, 8);
  expect(left.get(tuple)).toBe(8);
  expect(right.get(record)).toBe(1);
});

test('routing preserves raw Promises and thrown errors', () => {
  const promise = Promise.resolve(1);
  const pending = atom(promise);
  const error = new Error('failed');
  const failure = atom(() => {
    throw error;
  });
  const store = createStore();
  expect(store.get(flatMapAtom(atom(0), () => pending))).toBe(promise);
  expect(store.get(matchAtom(atom('pending' as const), { pending }))).toBe(promise);
  expect(() => store.get(matchAtom(atom('failure' as const), { failure }))).toThrow(error);
});

test('matchAtom evaluates only the active branch and reuses its cached value', () => {
  const mode = atom<'preview' | 'edit' | 'history'>('preview');
  const preview = atom('a');
  const editor = atom('b');
  const lazy1 = vi.fn((value) => `preview:${value}`);
  const lazy2 = vi.fn((value) => `edit:${value}`);
  const content = matchAtom(mode, {
    preview: ion(preview, lazy1),
    edit: ion(editor, lazy2),
    history: atom('history'),
  });
  expect(lazy1).not.toHaveBeenCalled();
  expect(lazy2).not.toHaveBeenCalled();
  expect(content).not.toHaveProperty('write');
  const store = createStore();
  const notify = vi.fn();
  const stop = store.sub(content, notify);
  expect(store.get(content)).toBe('preview:a');
  expect(lazy1).toHaveBeenCalledTimes(1);
  expect(lazy2).not.toHaveBeenCalled();
  store.set(mode, 'edit');
  notify.mockClear();
  store.set(preview, 'c');
  expect(notify).not.toHaveBeenCalled();
  expect(lazy1).toHaveBeenCalledTimes(1);
  store.set(mode, 'preview');
  expect(store.get(content)).toBe('preview:c');
  expect(lazy1).toHaveBeenCalledTimes(2);
  expect(lazy2).toHaveBeenCalledTimes(1);
  store.set(mode, 'history');
  store.set(mode, 'preview');
  expect(lazy1).toHaveBeenCalledTimes(2);
  stop();
});

test('matchAtom handles boolean/number keys, fallback and own properties', () => {
  const store = createStore();
  expect(store.get(matchAtom(atom(true), { true: atom(1), false: atom(0) }))).toBe(1);
  expect(store.get(matchAtom(atom<1 | 2>(2), { 1: atom('one'), 2: atom('two') }))).toBe('two');
  const key = atom<string>('toString');
  expect(store.get(matchAtom(key, { known: atom(1) }, { fallback: atom('missing') }))).toBe(
    'missing',
  );
  // @ts-expect-error JavaScript consumers receive a useful error for an unknown case.
  const missing = matchAtom(key, { known: atom(1) });
  expect(() => store.get(missing)).toThrow('matchAtom: no case for "toString"');
});

test('routing type contracts preserve readonly targets, exhaustive keys and unions', () => {
  const readonly = stateAtom(() => 1);
  const writable = stateAtom(0);
  const mode = stateAtom<'a' | 'b'>('a');
  const selected = flatMapAtom(mode, (key) => (key === 'a' ? readonly : writable));
  expectTypeOf(selected).toEqualTypeOf<Atom<number>>();
  const matched = matchAtom(mode, { a: readonly, b: stateAtom('text') });
  expectTypeOf(matched).toEqualTypeOf<Atom<number | string>>();
  function rejectionControls(store: ReturnType<typeof createStore>) {
    // @ts-expect-error A mixed readonly/writable target does not promise writes.
    store.set(selected, 1);
    // @ts-expect-error matchAtom is read-only even for writable branches.
    store.set(matched, 1);
    // @ts-expect-error Missing branch requires a fallback.
    matchAtom(mode, { a: readonly });
    // @ts-expect-error An unrelated branch is a typo.
    matchAtom(mode, { a: readonly, b: readonly, c: readonly });
    const optional: { a?: Atom<number>; b: Atom<number> } = { b: readonly };
    // @ts-expect-error A listed branch must actually contain an atom.
    matchAtom(mode, optional);
    // @ts-expect-error An open key requires a fallback.
    matchAtom(stateAtom<string>('a'), { a: readonly });
  }
  void rejectionControls;
});

test('a JavaScript write to a readonly flatMapAtom target fails explicitly', () => {
  const readonly = flatMapAtom(atom(0), () => atom(() => 1));
  const unsafe = readonly as WritableAtom<number, [number], void>;
  expect(() => createStore().set(unsafe, 2)).toThrow('selected atom is read-only');
});

test('target-only changes reuse selection and unchanged targets do not notify', () => {
  const source = atom(0);
  const target = atom(1);
  const choose = vi.fn((_value: number) => target);
  const selected = flatMapAtom(source, choose);
  const store = createStore();
  expect(choose).not.toHaveBeenCalled();
  const notify = vi.fn();
  const stop = store.sub(selected, notify);
  store.set(selected, (value) => value + 1);
  expect(store.get(selected)).toBe(2);
  expect(choose).toHaveBeenCalledTimes(1);
  notify.mockClear();
  store.set(source, 1);
  expect(choose).toHaveBeenCalledTimes(2);
  expect(notify).not.toHaveBeenCalled();
  stop();
});

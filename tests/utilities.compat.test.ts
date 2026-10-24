import { atom, createStore, Provider, type Atom } from 'jotai';
import {
  atomWithDefault,
  atomWithLazy,
  atomWithObservable,
  atomWithReducer,
  atomWithRefresh,
  atomWithReset,
  atomWithStorage,
  createJSONStorage,
  freezeAtom,
  RESET,
  selectAtom,
  splitAtom,
  unwrap,
} from 'jotai/utils';
import { withHistory, UNDO, REDO } from 'jotai-history';
import { atomFamily } from 'jotai-family';
import { atomWithImmer } from 'jotai-immer';
import { focusAtom } from 'jotai-optics';
import { atomWithQuery, atomWithSuspenseQuery } from 'jotai-tanstack-query';
import { QueryClient } from '@tanstack/react-query';
import { atomWithMachine } from 'jotai-xstate';
import { createMachine } from 'xstate';
import { BehaviorSubject } from 'rxjs';
import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server';
import { holo } from '../src/holo.js';
import { actionAtom } from '../src/action-atom.js';
import { stateAtom } from '../src/state-atom.js';

type Store = ReturnType<typeof createStore>;
function capture(target: Atom<unknown>, store: Store) {
  let value: unknown;
  const Connected = holo({
    core: function Core(props: { value: unknown }) {
      value = props.value;
      return null;
    },
    state: { value: target },
  });
  return { node: createElement(Provider, { store }, createElement(Connected)), value: () => value };
}
function read(target: Atom<unknown>, store = createStore()) {
  const current = capture(target, store);
  renderToStaticMarkup(current.node);
  return current.value();
}
async function readAsync(target: Atom<unknown>, store = createStore()) {
  const current = capture(target, store);
  const stream = await renderToReadableStream(current.node);
  await new Response(stream).text();
  return current.value();
}

test('primitive values, nullable state and functional state updates', () => {
  const store = createStore();
  const $value = stateAtom<number | null>(null);
  expect(read($value, store)).toBeNull();
  store.set($value, 1);
  store.set($value, (n) => (n ?? 0) + 1);
  expect(read($value, store)).toBe(2);
  expect(read(stateAtom(undefined))).toBeUndefined();
  expect(read(stateAtom(NaN))).toBeNaN();
  expect(Object.is(read(stateAtom(-0)), -0)).toBe(true);
});

test('dynamic derived dependencies switch cleanly', () => {
  const store = createStore();
  const a = atom(1);
  const b = atom(2);
  const chooseA = atom(true);
  const selected = stateAtom((get) => get(get(chooseA) ? a : b));
  expect(read(selected, store)).toBe(1);
  store.set(chooseA, false);
  expect(read(selected, store)).toBe(2);
  store.set(a, 99);
  expect(read(selected, store)).toBe(2);
});

test('native writable derived atoms bind state and actions without conversion', () => {
  const store = createStore();
  const base = atom(2);
  const doubled = atom(
    (get) => get(base) * 2,
    (_get, set, value: number) => set(base, value / 2),
  );
  let change: ((n: number) => void) | undefined;
  const Connected = holo({
    core: function Core(props: { value: number; change: (n: number) => void }) {
      change = props.change;
      return null;
    },
    state: { value: doubled },
    actions: { change: doubled },
  });
  renderToStaticMarkup(createElement(Provider, { store }, createElement(Connected)));
  if (!change) throw new Error('Core not rendered');
  change(10);
  expect(store.get(base)).toBe(5);
  expect(read(doubled, store)).toBe(10);
});

test('resettable and default atoms retain RESET behavior', () => {
  const store = createStore();
  const value = atomWithReset(1);
  const source = atom(2);
  const derived = atomWithDefault((get) => get(source) * 2);
  store.set(value, 5);
  expect(read(value, store)).toBe(5);
  store.set(value, RESET);
  expect(read(value, store)).toBe(1);
  store.set(derived, 100);
  store.set(source, 3);
  expect(read(derived, store)).toBe(100);
  store.set(derived, RESET);
  expect(read(derived, store)).toBe(6);
});

test('lazy atoms initialize on store access rather than holo creation', () => {
  let calls = 0;
  const lazy = atomWithLazy(() => ++calls);
  const C = holo({
    core: function Core(_props: { value: number }) {
      return null;
    },
    state: { value: lazy },
  });
  expect(calls).toBe(0);
  renderToStaticMarkup(createElement(Provider, { store: createStore() }, createElement(C)));
  expect(calls).toBe(1);
});

test('refreshable atoms can be refreshed through a zero-argument action', () => {
  const store = createStore();
  let version = 0;
  const refreshed = atomWithRefresh(() => ++version);
  expect(read(refreshed, store)).toBe(1);
  const refresh = actionAtom((_get, set) => set(refreshed));
  store.set(refresh);
  expect(read(refreshed, store)).toBe(2);
});

test('sync JSON storage retains writes and RESET removal', () => {
  const data = new Map([['count', '5']]);
  const storage = createJSONStorage<number>(() => ({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  }));
  const target = atomWithStorage('count', 0, storage, { getOnInit: true });
  const store = createStore();
  expect(read(target, store)).toBe(5);
  store.set(target, 7);
  expect(data.get('count')).toBe('7');
  expect(read(target, store)).toBe(7);
  store.set(target, RESET);
  expect(data.has('count')).toBe(false);
  expect(read(target, store)).toBe(0);
});

test('async storage resolves state and preserves promise-returning writes', async () => {
  const data = new Map([['count', '5']]);
  const storage = createJSONStorage<number>(() => ({
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  }));
  const target = atomWithStorage('count', 0, storage, { getOnInit: true });
  const store = createStore();
  expect(await readAsync(target, store)).toBe(5);
  await store.set(target, 8);
  expect(await readAsync(target, store)).toBe(8);
  await store.set(target, RESET);
  expect(await readAsync(target, store)).toBe(0);
});

test('reducers and frozen values preserve native semantics', () => {
  const store = createStore();
  const target = atomWithReducer(1, (value, amount: number) => value + amount);
  store.set(target, 2);
  expect(read(target, store)).toBe(3);
  const frozen = freezeAtom(atom({ count: 1 }));
  const value = read(frozen, store);
  expect(Object.isFrozen(value)).toBe(true);
});

test('families retain per-key identity and removal semantics', () => {
  const family = atomFamily((id: number) => atom(id));
  const store = createStore();
  const first = family(1);
  store.set(first, 10);
  expect(read(family(1), store)).toBe(10);
  expect(read(family(2), store)).toBe(2);
  family.remove(1);
  expect(read(family(1), store)).toBe(1);
});

test('selectAtom and splitAtom results remain native atoms', () => {
  const store = createStore();
  const item = { id: 1 };
  const source = atom([item, { id: 2 }]);
  const selected = selectAtom(source, (values) => values[0]);
  expect(read(selected, store)).toBe(item);
  const parts = splitAtom(source);
  const [first] = store.get(parts);
  if (!first) throw new Error('Missing item');
  expect(read(first, store)).toBe(item);
});

test('unwrap provides explicit fallback values and resolved values', async () => {
  const store = createStore();
  const target = atom(Promise.resolve(2));
  const unwrapped = unwrap(target, () => -1);
  expect(read(unwrapped, store)).toBe(-1);
  await store.get(target);
  expect(read(unwrapped, store)).toBe(2);
});

test('observable atoms expose emissions through holo', () => {
  const subject = new BehaviorSubject(1);
  const target = atomWithObservable(() => subject, { initialValue: 0 });
  const store = createStore();
  const stop = store.sub(target, () => undefined);
  expect(read(target, store)).toBe(1);
  subject.next(2);
  expect(read(target, store)).toBe(2);
  stop();
  subject.complete();
});

test('Immer and optics remain writable through actions', () => {
  const store = createStore();
  const target = atomWithImmer({ count: 1 });
  const increment = actionAtom((_get, set) =>
    set(target, (draft) => {
      draft.count++;
    }),
  );
  store.set(increment);
  expect(read(target, store)).toEqual({ count: 2 });
  const count = focusAtom(target, (optic) => optic.prop('count'));
  store.set(count, 4);
  expect(read(target, store)).toEqual({ count: 4 });
});

test('query atoms can consume an explicitly owned QueryClient cache', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['user'], { name: 'Ada' });
  const query = atomWithQuery(
    () => ({ queryKey: ['user'], queryFn: async () => ({ name: 'Ada' }) }),
    () => client,
  );
  const store = createStore();
  const stop = store.sub(query, () => undefined);
  expect(store.get(query).data).toEqual({ name: 'Ada' });
  expect(read(query, store)).toMatchObject({ data: { name: 'Ada' }, isSuccess: true });
  const pending = atomWithSuspenseQuery(
    () => ({ queryKey: ['number'], queryFn: async () => 42 }),
    () => client,
  );
  expect(await readAsync(pending, store)).toMatchObject({ data: 42 });
  stop();
  client.clear();
});

test('state machine snapshots and events work without special holo support', () => {
  const machine = createMachine({
    initial: 'idle',
    states: { idle: { on: { START: 'active' } }, active: {} },
  });
  const target = atomWithMachine(machine);
  const store = createStore();
  const stop = store.sub(target, () => undefined);
  expect(store.get(target).value).toBe('idle');
  store.set(target, { type: 'START' });
  expect(read(target, store)).toMatchObject({ value: 'active' });
  stop();
});

test('history retains undo and redo when read through holo', () => {
  const $value = atom(0);
  const history = withHistory($value, 5);
  const store = createStore();
  const stop = store.sub(history, () => undefined);
  store.set(history, 1);
  store.set(history, 2);
  expect(read(history, store)).toMatchObject({ canUndo: true });
  store.set(history, UNDO);
  expect(store.get($value)).toBe(1);
  store.set(history, REDO);
  expect(store.get($value)).toBe(2);
  stop();
});

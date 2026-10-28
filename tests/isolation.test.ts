import { captureEvent } from './event-harness.js';
import { atom, createStore, type Atom } from 'jotai/vanilla';
import { expect, test, vi } from 'vitest';
import { actionAtom, bond, eventAtom, ion, prism, stateAtom } from '../src/vanilla.js';

test('prism follows dynamic dependencies independently in each store and releases the old branch', () => {
  const $left = stateAtom(1);
  const $right = stateAtom(10);
  const $chooseLeft = stateAtom(true);
  const readLeft = vi.fn((value: number) => value);
  const readRight = vi.fn((value: number) => value);
  const $selected = stateAtom((get) =>
    get($chooseLeft) ? readLeft(get($left)) : readRight(get($right)),
  );
  const unused = vi.fn(() => {
    throw new Error('unread projection');
  });
  const { $value } = prism($selected, { $value: (n) => n, $unused: unused });
  const a = createStore();
  const b = createStore();
  b.set($chooseLeft, false);
  const seenA = vi.fn();
  const seenB = vi.fn();
  expect(readLeft).not.toHaveBeenCalled();
  expect(readRight).not.toHaveBeenCalled();
  const stopA = a.sub($value, seenA);
  const stopB = b.sub($value, seenB);
  expect(a.get($value)).toBe(1);
  expect(b.get($value)).toBe(10);
  a.set($right, 99);
  expect(readRight).toHaveBeenCalledTimes(1);
  expect(seenA).not.toHaveBeenCalled();
  a.set($chooseLeft, false);
  expect(a.get($value)).toBe(99);
  expect(b.get($value)).toBe(10);
  stopA();
  const reads = readRight.mock.calls.length;
  a.set($right, 100);
  expect(readRight).toHaveBeenCalledTimes(reads);
  expect(unused).not.toHaveBeenCalled();
  expect(seenB).not.toHaveBeenCalled();
  stopB();
});

test('separate factory models isolate state within one store, while one model isolates values across stores', () => {
  const createCounter = () => {
    const $count = stateAtom(0);
    const $view = ion($count, (count) => ({ count }));
    const increment = actionAtom((_get, set) => set($count, (n) => n + 1));
    return { $count, $view, increment };
  };
  const first = createCounter();
  const second = createCounter();
  const a = createStore();
  const b = createStore();
  a.set(first.increment);
  expect(a.get(first.$view)).toEqual({ count: 1 });
  expect(a.get(second.$view)).toEqual({ count: 0 });
  expect(b.get(first.$view)).toEqual({ count: 0 });
  expect(b.get(second.$view)).toEqual({ count: 0 });
});

test('async projections do not start unread siblings or share pending work between stores', async () => {
  const $value = stateAtom(0);
  const pending: { value: number; resolve: (value: number) => void }[] = [];
  const unused = vi.fn(async () => 999);
  const { $remote } = prism($value, {
    $remote: (value) => new Promise<number>((resolve) => pending.push({ value, resolve })),
    $unused: unused,
  });
  const a = createStore();
  const b = createStore();
  a.set($value, 1);
  b.set($value, 2);
  expect(pending).toEqual([]);
  const first = a.get($remote);
  expect(a.get($remote)).toBe(first);
  expect(pending.map((entry) => entry.value)).toEqual([1]);
  const second = b.get($remote);
  expect(second).not.toBe(first);
  expect(pending.map((entry) => entry.value)).toEqual([1, 2]);
  pending[1]!.resolve(20);
  await expect(second).resolves.toBe(20);
  pending[0]!.resolve(10);
  await expect(first).resolves.toBe(10);
  expect(unused).not.toHaveBeenCalled();
});

test('an async action keeps get/set and its trigger delivery in the invocation store after await', async () => {
  const $value = stateAtom(0);
  let resolve!: (value: number) => void;
  const pending = new Promise<number>((done) => {
    resolve = done;
  });
  const save = actionAtom(async (get, set) => {
    const received = await pending;
    set($value, get($value) + received);
  });
  const a = createStore();
  const b = createStore();
  a.set($value, 1);
  b.set($value, 100);
  const calledA = vi.fn();
  const calledB = vi.fn();
  const link = bond({ trigger: save, write: actionAtom(() => {}) });
  const output = prism(link, { $args: (args) => args });
  const stopA = link.connect(a);
  const stopB = link.connect(b);
  const watchA = a.sub(output.$args, calledA);
  const watchB = b.sub(output.$args, calledB);
  const result = a.set(save);
  expect(calledA).toHaveBeenCalledTimes(1);
  expect(calledB).not.toHaveBeenCalled();
  stopA();
  resolve(5);
  await result;
  expect(a.get($value)).toBe(6);
  expect(b.get($value)).toBe(100);
  expect(calledA).toHaveBeenCalledTimes(1);
  expect(calledB).not.toHaveBeenCalled();
  watchA();
  watchB();
  stopB();
});

test('event dispatch queues and disposal remain independent during nested calls into another store', () => {
  const event = eventAtom<number>();
  const a = createStore();
  const b = createStore();
  const seen: string[] = [];
  const stopA = captureEvent(a, event, (value) => {
    seen.push(`a:start:${value}`);
    b.set(event, value + 1);
    seen.push(`a:end:${value}`);
  });
  const stopB = captureEvent(b, event, (value) => seen.push(`b:${value}`));
  a.set(event, 1);
  expect(seen).toEqual(['a:start:1', 'b:2', 'a:end:1']);
  stopA();
  a.set(event, 3);
  b.set(event, 4);
  expect(seen).toEqual(['a:start:1', 'b:2', 'a:end:1', 'b:4']);
  stopB();
});

test('a connected bond chain ref-counts owners independently per store and reconnects without replay', () => {
  const trigger = eventAtom<number>();
  const $offset = stateAtom(0);
  const $saved = stateAtom(0);
  const upstream = bond({ state: $offset, trigger, map: (offset, n) => [offset + n] });
  const downstream = bond({ trigger: upstream, write: $saved });
  const a = createStore();
  const b = createStore();
  a.set($offset, 10);
  b.set($offset, 100);
  a.set(trigger, 9);
  const firstA = downstream.connect(a);
  const secondA = downstream.connect(a);
  const stopB = downstream.connect(b);
  expect(a.get(downstream)).toBeUndefined();
  a.set(trigger, 1);
  b.set(trigger, 2);
  expect(a.get($saved)).toBe(11);
  expect(b.get($saved)).toBe(102);
  firstA();
  a.set(trigger, 3);
  expect(a.get($saved)).toBe(13);
  secondA();
  a.set(trigger, 4);
  b.set(trigger, 5);
  expect(a.get($saved)).toBe(13);
  expect(b.get($saved)).toBe(105);
  const reconnect = downstream.connect(a);
  expect(a.get($saved)).toBe(13);
  firstA();
  a.set(trigger, 6);
  expect(a.get($saved)).toBe(16);
  reconnect();
  stopB();
});

test('bond resolves writable recipients lazily from the invocation store without reading them', () => {
  const a = createStore();
  const b = createStore();
  const $saved = stateAtom(0);
  const read = vi.fn(() => {
    throw new Error('write-only usage must not read');
  });
  const first = atom(read, (_get, set, value: number) => set($saved, value));
  const second = atom(read, (_get, set, value: number) => set($saved, value * 10));
  const $recipient = stateAtom(first);
  b.set($recipient, second);
  const trigger = eventAtom<number>();
  const resolve = vi.fn((get: import('jotai/vanilla').Getter) => get($recipient));
  const link = bond({ trigger, write: resolve });
  const stopA = link.connect(a);
  const stopB = link.connect(b);
  expect(resolve).not.toHaveBeenCalled();
  a.set(trigger, 2);
  b.set(trigger, 3);
  expect(a.get($saved)).toBe(2);
  expect(b.get($saved)).toBe(30);
  expect(read).not.toHaveBeenCalled();
  stopA();
  stopB();
});

test('native write-only atoms are writable recipients but their calls are not observable clocks', () => {
  const calls = vi.fn();
  const native = atom(null, (_get, _set, value: number) => calls(value));
  const forwarded = vi.fn();
  const link = bond({
    trigger: native,
    write: actionAtom((_get, _set, value: null) => forwarded(value)),
  });
  const store = createStore();
  const stop = link.connect(store);
  store.set(native, 1);
  store.set(native, 1);
  expect(calls).toHaveBeenCalledTimes(2);
  expect(forwarded).not.toHaveBeenCalled();
  stop();
});

test('ion reads all declared record inputs even when its projector returns only one field', () => {
  const first = vi.fn(() => 1);
  const second = vi.fn(() => 2);
  const source: { first: Atom<number>; second: Atom<number> } = {
    first: atom(first),
    second: atom(second),
  };
  const selected = ion(source, ({ first }) => first);
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  expect(createStore().get(selected)).toBe(1);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
});

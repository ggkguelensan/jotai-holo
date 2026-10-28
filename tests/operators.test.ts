import { atom, createStore, type Atom } from 'jotai/vanilla';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { actionAtom, bond, ion, prism } from '../src/vanilla.js';

const store = () => createStore();

test('ion preserves single/object/tuple shape, reactivity, store isolation and native async values', async () => {
  const $a = atom(2);
  const $b = atom(3);
  const $sum = ion({ a: $a, b: $b }, ({ a, b }) => a + b);
  const $tuple = ion([$a, $b] as const);
  const first = store();
  const second = store();
  expect(first.get($sum)).toBe(5);
  first.set($a, 4);
  expect(first.get($sum)).toBe(7);
  expect(second.get($sum)).toBe(5);
  expect(first.get($tuple)).toEqual([4, 3]);
  const $async = atom(Promise.resolve(7));
  const $projected = ion($async, async (value) => (await value) * 2);
  await expect(first.get($projected)).resolves.toBe(14);
  expectTypeOf($tuple).toEqualTypeOf<Atom<[number, number]>>();
});

test('prism creates independent read-only projections and preserves undefined/errors/promise semantics', async () => {
  const $user = atom({ name: 'Ada', age: 17 });
  const { $name, $adult } = prism($user, {
    $name: (user) => user.name,
    $adult: (user) => user.age >= 18,
  });
  const s = store();
  const seen: string[] = [];
  const stop = s.sub($name, () => seen.push(s.get($name)));
  s.set($user, { name: 'Ada', age: 18 });
  expect(s.get($adult)).toBe(true);
  expect(seen).toEqual([]);
  s.set($user, { name: 'Grace', age: 18 });
  expect(seen).toEqual(['Grace']);
  stop();
  const { $missing } = prism($user, { $missing: () => undefined });
  expect(s.get($missing)).toBeUndefined();
  const error = new Error('projection');
  const { $error } = prism($user, {
    $error: () => {
      throw error;
    },
  });
  expect(() => s.get($error)).toThrow(error);
  const parts = prism(atom(Promise.resolve({ name: 'Ada' })), {
    $name: async (value) => (await value).name,
  });
  await expect(s.get(parts.$name)).resolves.toBe('Ada');
});

test('bond forwards every call including repeated payloads, preserves action result and isolates stores', () => {
  const trigger = actionAtom((_get, _set, value: number) => value * 2);
  const seen: number[] = [];
  const target = actionAtom((_get, _set, value: number) => {
    seen.push(value);
  });
  const link = bond({ trigger, write: target });
  const a = store();
  const b = store();
  const stop = link.connect(a);
  expect(a.set(trigger, 2)).toBe(4);
  a.set(trigger, 2);
  b.set(trigger, 3);
  expect(seen).toEqual([2, 2]);
  expect(a.get(link)).toEqual([2]);
  expect(b.get(link)).toBeUndefined();
  stop();
  stop();
  a.set(trigger, 4);
  expect(seen).toEqual([2, 2]);
});

test('bond reads after synchronous writes, guard skips map and resolver, and forwards tuple arguments', () => {
  const $count = atom(0);
  const $allowed = atom(false);
  const trigger = actionAtom((_get, set, amount: number) => {
    set($count, (n) => n + amount);
  });
  const calls: unknown[] = [];
  const target = actionAtom((_get, _set, count: number, amount: number) => {
    calls.push([count, amount]);
  });
  const resolve = vi.fn(() => target);
  const map = vi.fn(({ count }: { count: number }, amount: number): [number, number] => [
    count,
    amount,
  ]);
  const link = bond({ state: { count: $count }, trigger, guard: $allowed, map, write: resolve });
  const s = store();
  const stop = link.connect(s);
  s.set(trigger, 2);
  expect(map).not.toHaveBeenCalled();
  expect(resolve).not.toHaveBeenCalled();
  s.set($allowed, true);
  expect(calls).toEqual([]);
  s.set(trigger, 3);
  expect(calls).toEqual([[5, 3]]);
  stop();
});

test('bond defaults state to one argument, no-state callbacks get only trigger args, and state is an implicit clock', () => {
  const $name = atom('Ada');
  const trigger = actionAtom<[boolean]>();
  const seen: unknown[] = [];
  const save = actionAtom((_get, _set, name: string) => {
    seen.push(name);
  });
  const explicit = bond({ state: $name, trigger, write: save });
  const implicit = bond({ state: $name, write: save });
  const filtered = bond({
    trigger,
    guard: (notify) => notify,
    map: (notify) => [String(notify)],
    write: save,
  });
  const s = store();
  const stops = [explicit.connect(s), implicit.connect(s), filtered.connect(s)];
  expect(seen).toEqual([]);
  s.set(trigger, false);
  expect(seen).toEqual(['Ada']);
  s.set(trigger, true);
  expect(seen).toEqual(['Ada', 'Ada', 'true']);
  s.set($name, 'Grace');
  expect(seen.at(-1)).toBe('Grace');
  stops.forEach((stop) => stop());
});

test('derived outputs activate upstream links, shared connections are ref-counted and disposal stops the chain', () => {
  const requested = actionAtom<[number]>();
  const prepared = bond({ trigger: requested, map: (value) => [value * 2] });
  const values: number[] = [];
  const terminal = bond({
    trigger: prepared,
    write: actionAtom((_get, _set, value: number) => {
      values.push(value);
    }),
  });
  const s = store();
  const first = terminal.connect(s);
  const second = terminal.connect(s);
  s.set(requested, 2);
  expect(values).toEqual([4]);
  first();
  s.set(requested, 3);
  expect(values).toEqual([4, 6]);
  second();
  s.set(requested, 4);
  expect(values).toEqual([4, 6]);
});

test('source-only generated output initializes without publishing and updates only on source changes', () => {
  const $count = atom(2);
  const $allow = atom(true);
  const selected = bond({ state: $count, guard: $allow, map: (value) => [value * 2] });
  const s = store();
  const stop = selected.connect(s);
  expect(s.get(selected)).toEqual([4]);
  s.set($allow, false);
  s.set($count, 3);
  expect(s.get(selected)).toEqual([4]);
  s.set($allow, true);
  expect(s.get(selected)).toEqual([4]);
  s.set($count, 4);
  expect(s.get(selected)).toEqual([8]);
  stop();
});

test('sync target errors and async rejections reach owners without changing trigger Promise identity', async () => {
  const promise = Promise.resolve('request');
  const trigger = actionAtom((_get, _set, _id: number) => promise);
  const sync = new Error('sync');
  const async = new Error('async');
  const errors: unknown[] = [];
  const first = bond({
    trigger,
    write: actionAtom((_get, _set, _id: number) => {
      throw sync;
    }),
  });
  const second = bond({
    trigger,
    write: actionAtom(async (_get, _set, _id: number) => {
      throw async;
    }),
  });
  const s = store();
  const stops = [
    first.connect(s, { onError: (e) => errors.push(e) }),
    second.connect(s, { onError: (e) => errors.push(e) }),
  ];
  expect(s.set(trigger, 1)).toBe(promise);
  await promise;
  await Promise.resolve();
  expect(errors).toEqual([sync, async]);
  stops.forEach((stop) => stop());
});

test('nested emissions use FIFO order, repeated nested events are retained, and bounded feedback works', () => {
  const trigger = actionAtom<[number]>();
  const values: number[] = [];
  const feedback = bond({
    trigger,
    guard: (value) => value < 3,
    map: (value) => [value + 1],
    write: trigger,
  });
  const observer = bond({
    trigger,
    write: actionAtom((_get, _set, value: number) => {
      values.push(value);
    }),
  });
  const s = store();
  const stops = [feedback.connect(s), observer.connect(s)];
  s.set(trigger, 0);
  expect(values).toEqual([0, 1, 2, 3]);
  stops.forEach((stop) => stop());
});

test('bond releases native subscriptions on last disposal and can reconnect', () => {
  const $value = atom(0);
  let active = 0;
  $value.onMount = () => {
    active++;
    return () => {
      active--;
    };
  };
  const link = bond({ state: $value });
  const s = store();
  const first = link.connect(s);
  const second = link.connect(s);
  expect(active).toBe(1);
  first();
  expect(active).toBe(1);
  second();
  expect(active).toBe(0);
  const third = link.connect(s);
  expect(active).toBe(1);
  s.set($value, 1);
  expect(s.get(link)).toEqual([1]);
  third();
  expect(active).toBe(0);
});

test('bond disposes queued work, contains feedback cycles and recovers for the next event', () => {
  const trigger = actionAtom<[number]>();
  const errors: unknown[] = [];
  const loop = bond({ trigger, write: trigger });
  const s = store();
  const stop = loop.connect(s, { onError: (error) => errors.push(error) });
  s.set(trigger, 1);
  expect(errors).toHaveLength(1);
  expect(String(errors[0])).toContain('cycle');
  stop();
  const calls: number[] = [];
  let disconnect = () => {};
  const first = bond({
    trigger,
    write: actionAtom((_get, _set, _n: number) => {
      disconnect();
    }),
  });
  const second = bond({
    trigger,
    write: actionAtom((_get, _set, n: number) => {
      calls.push(n);
    }),
  });
  const stopFirst = first.connect(s);
  disconnect = second.connect(s);
  s.set(trigger, 2);
  expect(calls).toEqual([]);
  stopFirst();
  const stopSecond = second.connect(s);
  s.set(trigger, 3);
  expect(calls).toEqual([3]);
  stopSecond();
});

test('bond handles derived clock errors and cleans up after failed connection', () => {
  const $fail = atom(false);
  const error = new Error('clock');
  const errors: unknown[] = [];
  const $clock = atom((get) => {
    if (get($fail)) throw error;
    return 1;
  });
  const s = store();
  const link = bond({ trigger: $clock });
  const stop = link.connect(s, { onError: (e) => errors.push(e) });
  s.set($fail, true);
  expect(errors).toEqual([error]);
  stop();
  expect(() => link.connect(s)).toThrow(error);
  s.set($fail, false);
  const again = link.connect(s);
  again();
});

test('all 24 valid combinations of optional bond fields deliver the expected argument tuple', () => {
  for (let flags = 1; flags < 32; flags++) {
    const withState = Boolean(flags & 1);
    const withTrigger = Boolean(flags & 2);
    if (!withState && !withTrigger) continue;
    const withGuard = Boolean(flags & 4);
    const withMap = Boolean(flags & 8);
    const withTarget = Boolean(flags & 16);
    const $value = atom(1);
    const trigger = actionAtom<[number]>();
    const calls: number[][] = [];
    const target = actionAtom((_get, _set, ...args: number[]) => {
      calls.push(args);
    });
    const config = {
      ...(withState ? { state: $value } : {}),
      ...(withTrigger ? { trigger } : {}),
      ...(withGuard ? { guard: atom(true) } : {}),
      ...(withMap ? { map: (...args: number[]) => [args.reduce((sum, n) => sum + n, 0)] } : {}),
      ...(withTarget ? { write: target } : {}),
    };
    const link = Reflect.apply(bond, undefined, [config]) as import('../src/bond.js').Bond<
      number[]
    >;
    const s = store();
    const stop = link.connect(s);
    s.set($value, 3);
    if (withTrigger) s.set(trigger, 2);
    const expected = withMap && withState && withTrigger ? [5] : withState ? [3] : [2];
    expect(s.get(link), `combination ${flags}`).toEqual(expected);
    expect(calls, `target combination ${flags}`).toEqual(withTarget ? [expected] : []);
    stop();
  }
});

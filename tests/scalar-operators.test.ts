import { atom, createStore } from 'jotai/vanilla';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { and, eq, or, some, sum } from '../src/vanilla.js';

test('eq lazily compares constants and atoms per store with Object.is semantics', () => {
  const read = vi.fn(() => 1);
  const $left = atom(read);
  const $right = atom(1);
  const $equal = eq($left, $right);
  const a = createStore();
  const b = createStore();
  expect(read).not.toHaveBeenCalled();
  expect(a.get($equal)).toBe(true);
  a.set($right, 2);
  expect(a.get($equal)).toBe(false);
  expect(b.get($equal)).toBe(true);
  expect(a.get(eq(atom(NaN), NaN))).toBe(true);
  expect(a.get(eq(atom(0), -0))).toBe(false);
  expect(a.get(eq(atom<'ready' | 'loading'>('ready'), 'ready'))).toBe(true);
});

test.each([
  ['and', and, false, true],
  ['or', or, true, false],
] as const)(
  '%s short-circuits, changes dependencies, and releases subscriptions',
  (_name, operator, first, next) => {
    const $gate = atom<boolean>(first);
    let active = 0;
    const read = vi.fn(() => true);
    const $raw = atom(true);
    const $later = atom((get) => {
      read();
      return get($raw);
    });
    $raw.onMount = () => {
      active++;
      return () => {
        active--;
      };
    };
    const $result = operator([$gate, $later]);
    const store = createStore();
    expect(read).not.toHaveBeenCalled();
    const stop = store.sub($result, () => {});
    expect(store.get($result)).toBe(first);
    expect(read).not.toHaveBeenCalled();
    expect(active).toBe(0);
    store.set($gate, next);
    expect(read).toHaveBeenCalledTimes(1);
    expect(active).toBe(1);
    store.set($gate, first);
    expect(active).toBe(0);
    stop();
  },
);

test('boolean operators accept records and single atoms, isolate stores, and define empty identities', () => {
  const $first = atom(true);
  const $second = atom(false);
  const $both = and({ first: $first, second: $second });
  const $either = or([$first, $second]);
  const a = createStore();
  const b = createStore();
  expect(a.get(and([]))).toBe(true);
  expect(a.get(or({}))).toBe(false);
  expect(a.get(and($first))).toBe(true);
  a.set($second, true);
  expect(a.get($both)).toBe(true);
  expect(b.get($both)).toBe(false);
  expect(b.get($either)).toBe(true);
});

test('some tests array-valued atoms and heterogeneous atom collections lazily', () => {
  const $products = atom([{ available: false }, { available: true }]);
  const predicate = vi.fn((product: { available: boolean }) => product.available);
  const $available = some($products, predicate);
  const store = createStore();
  expect(predicate).not.toHaveBeenCalled();
  expect(store.get($available)).toBe(true);
  expect(predicate).toHaveBeenCalledTimes(2);
  const unused = vi.fn(() => {
    throw new Error('short-circuited');
  });
  expect(store.get(some([atom(1), atom(unused)], (n) => n === 1))).toBe(true);
  expect(unused).not.toHaveBeenCalled();
  expect(
    store.get(some({ first: atom('ready'), second: atom(0) }, (value) => value === 'ready')),
  ).toBe(true);
  expect(store.get(some(atom<number[]>([]), () => true))).toBe(false);
});

test('sum supports scalar/array atoms, tuples and records without async coercion', () => {
  const $price = atom(100);
  const $delivery = atom(20);
  const $total = sum({ price: $price, delivery: $delivery });
  const a = createStore();
  const b = createStore();
  const changed = vi.fn();
  const stop = a.sub($total, changed);
  a.set($price, 150);
  expect(a.get($total)).toBe(170);
  expect(b.get($total)).toBe(120);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(a.get(sum([]))).toBe(0);
  expect(a.get(sum(atom([1, 2, 3])))).toBe(6);
  expect(a.get(sum($price))).toBe(150);
  stop();
});

function typeChecks() {
  expectTypeOf(some([atom(1), atom('name')], (value) => typeof value === 'string')).toEqualTypeOf<
    import('jotai').Atom<boolean>
  >();
  // @ts-expect-error Boolean operators do not coerce numbers.
  and([atom(1)]);
  // @ts-expect-error Promise values must be explicitly resolved upstream.
  or([atom(Promise.resolve(true))]);
  // @ts-expect-error Only numeric inputs are accepted.
  sum({ name: atom('name') });
  // @ts-expect-error Equality operands must have compatible types.
  eq(atom(1), atom('one'));
  // @ts-expect-error Some requires a collection or collection of atoms.
  some(atom(1), () => true);
}
void typeChecks;

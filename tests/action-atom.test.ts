import { atom, createStore } from 'jotai';
import { describe, expect, expectTypeOf, test } from 'vitest';

import { actionAtom } from '../src/action-atom.js';

describe('actionAtom', () => {
  test('reads state, writes multiple atoms and returns the handler result', () => {
    const count = atom(1);
    const label = atom('');
    const increment = actionAtom((get, set, amount: number, prefix: string) => {
      const next = get(count) + amount;
      set(count, next);
      set(label, `${prefix}${next}`);
      return next;
    });
    const first = createStore();
    const second = createStore();

    expect(first.set(increment, 2, 'Count: ')).toBe(3);
    expect(first.get(label)).toBe('Count: 3');
    expect(second.get(count)).toBe(1);
    expect(second.get(label)).toBe('');
    expectTypeOf(first.set(increment, 0, '')).toEqualTypeOf<number>();
  });

  test('supports no-argument and async actions, including rejected promises', async () => {
    const count = atom(0);
    const reset = actionAtom((_get, set) => set(count, 0));
    const save = actionAtom(async (_get, set, input: Promise<number>) => {
      const value = await input;
      set(count, value);
      return value;
    });
    const store = createStore();

    await expect(store.set(save, Promise.resolve(7))).resolves.toBe(7);
    expect(store.get(count)).toBe(7);
    const error = new Error('save failed');
    await expect(store.set(save, Promise.reject(error))).rejects.toBe(error);
    expect(store.get(count)).toBe(7);
    store.set(reset);
    expect(store.get(count)).toBe(0);
  });
});

import { act, type ReactNode } from 'react';
import { createStore, Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { atomEffect, observe, withAtomEffect } from 'jotai-effect';
import { ScopeProvider as AtomScope } from 'jotai-scope';
import { expect, test } from 'vitest';
import { holo, stateAtom, actionAtom } from '../src/index.js';
import { createHarness } from './browser-harness.js';

function Value({ count, increment }: { count: number; increment: () => void }) {
  return <button onClick={increment}>{count}</button>;
}

test('withAtomEffect owns a subscription and disposes with the last consumer', async () => {
  const events: string[] = [];
  const $count = stateAtom(0);
  const watched = withAtomEffect($count, (get) => {
    events.push(`read:${get($count)}`);
    return () => {
      events.push('cleanup');
    };
  });
  const increment = actionAtom((_get, set) => {
    set($count, (n) => n + 1);
  });
  const C = holo({ view: Value, read: { count: watched }, write: { increment } });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
      <C />
    </Provider>,
  );
  expect(events).toEqual(['read:0']);
  await act(async () => {
    store.set(increment);
  });
  expect(h.container.textContent).toBe('11');
  expect(events).toEqual(['read:0', 'cleanup', 'read:1']);
  await h.unmount();
  expect(events.at(-1)).toBe('cleanup');
});

test('atomEffect and observe use the same explicit store as holo', async () => {
  const store = createStore();
  const $count = stateAtom(2);
  const $observed = stateAtom(0);
  const effect = atomEffect((get, set) => {
    set($observed, get($count) * 2);
  });
  const $display = stateAtom((get) => {
    get(effect);
    return get($observed);
  });
  const C = holo({
    view: ({ count }: { count: number }) => <b>{count}</b>,
    read: { count: $display },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  expect(h.container.textContent).toBe('4');
  await act(async () => {
    store.set($count, 3);
  });
  expect(h.container.textContent).toBe('6');
  await h.unmount();
  const seen: number[] = [];
  const stop = observe((get) => {
    seen.push(get($count));
  }, store);
  store.set($count, 4);
  stop();
  store.set($count, 5);
  expect(seen).toEqual([3, 4]);
});

test('hydration is available before a connected child first reads state', async () => {
  const $count = stateAtom(0);
  const C = holo({
    view: ({ count }: { count: number }) => <b>{count}</b>,
    read: { count: $count },
  });
  function Hydrate({ children }: { children: ReactNode }) {
    useHydrateAtoms([[$count, 12]]);
    return children;
  }
  const h = createHarness();
  await h.render(
    <Provider>
      <Hydrate>
        <C />
      </Hydrate>
    </Provider>,
  );
  expect(h.container.textContent).toBe('12');
});

test('jotai-scope isolates a bound primitive and its derived state', async () => {
  const $count = stateAtom(0);
  const $double = stateAtom((get) => get($count) * 2);
  const increment = actionAtom((_get, set) => {
    set($count, (n) => n + 1);
  });
  const C = holo({ view: Value, read: { count: $double }, write: { increment } });
  const h = createHarness();
  await h.render(
    <Provider>
      <C />
      <AtomScope atoms={[$count]}>
        <C />
      </AtomScope>
    </Provider>,
  );
  const buttons = h.container.querySelectorAll('button');
  await act(async () => {
    buttons[1]?.click();
  });
  expect([...buttons].map((b) => b.textContent)).toEqual(['0', '2']);
});

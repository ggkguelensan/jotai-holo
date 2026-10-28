import { atom, createStore, Provider } from 'jotai';
import { act, useEffect, useState } from 'react';
import { createModel } from '../src/model.js';
import { expect, test, vi } from 'vitest';
import { actionAtom, holo, holoList, holoMatch, prism } from '../src/index.js';
import { createHarness } from './browser-harness.js';

test('holoList and holoMatch keep row identity and branch subscriptions separate across stores', async () => {
  const $mode = atom<'list' | 'hidden'>('list');
  const $items = atom<readonly { id: string }[]>([{ id: 'one' }, { id: 'two' }]);
  const $raw = atom(0);
  const project = vi.fn((value: number) => value);
  const { $value } = prism($raw, { $value: project });
  const List = holoList({
    source: $items,
    getKey: (item) => item.id,
    mapItem: (item) => ({ id: item.id }),
    read: { value: $value },
    view: ({ id, value }: { id: string; value: number }) => {
      const [local, setLocal] = useState(0);
      return (
        <button data-id={id} onClick={() => setLocal((n) => n + 1)}>
          {id}:{local}:{value}
        </button>
      );
    },
  });
  const Page = holoMatch({
    source: $mode,
    cases: { list: List, hidden: () => <span>hidden</span> },
  });
  const a = createStore();
  const b = createStore();
  b.set($mode, 'hidden');
  b.set($raw, 10);
  const h = createHarness();
  await h.render(
    <>
      <section data-store="a">
        <Provider store={a}>
          <Page />
        </Provider>
      </section>
      <section data-store="b">
        <Provider store={b}>
          <Page />
        </Provider>
      </section>
    </>,
  );
  expect(project).toHaveBeenCalledTimes(1);
  const first = h.container.querySelector<HTMLButtonElement>('[data-store="a"] [data-id="one"]')!;
  await act(async () => first.click());
  await act(async () => a.set($items, [{ id: 'two' }, { id: 'one' }]));
  expect(h.container.querySelector('[data-store="a"] [data-id="one"]')).toBe(first);
  expect(first.textContent).toBe('one:1:0');
  await act(async () => b.set($mode, 'list'));
  expect(project).toHaveBeenCalledTimes(2);
  expect(h.container.querySelector('[data-store="b"] [data-id="one"]')?.textContent).toBe(
    'one:0:10',
  );
  await act(async () => a.set($mode, 'hidden'));
  const reads = project.mock.calls.length;
  await act(async () => a.set($raw, 5));
  expect(project).toHaveBeenCalledTimes(reads);
  expect(h.container.querySelector('[data-store="b"] [data-id="one"]')?.textContent).toBe(
    'one:0:10',
  );
});

test('a named model binding observes a synchronous write by its child mount effect', async () => {
  const $count = atom(0);
  const increment = actionAtom((_get, set) => set($count, (n) => n + 1));
  const Model = createModel({ create: () => ({ $count, increment }) });
  function Child({ increment }: { increment: () => void }) {
    useEffect(increment, [increment]);
    return null;
  }
  const Counter = holo({
    view: ({ count, increment }: { count: number; increment: () => void }) => (
      <>
        <span data-count>{count}</span>
        <Child increment={increment} />
      </>
    ),
    models: { counter: Model },
    read: ({ counter }) => ({ count: counter.$count }),
    write: ({ counter }) => ({ increment: counter.increment }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Counter />
    </Provider>,
  );
  expect(store.get($count)).toBe(1);
  expect(h.container.querySelector('[data-count]')?.textContent).toBe('1');
});

test('one holo definition isolates state, action callbacks, lifecycles and subscription ownership across stores', async () => {
  const $count = atom(0);
  let active = 0;
  $count.onMount = () => {
    active++;
    return () => {
      active--;
    };
  };
  const increment = actionAtom((_get, set) => set($count, (n) => n + 1));
  const Counter = holo({
    view: ({
      count,
      name,
      onIncrement,
    }: {
      count: number;
      name: string;
      onIncrement: () => void;
    }) => (
      <button data-name={name} onClick={onIncrement}>
        {count}
      </button>
    ),
    read: { count: $count },
    write: { onIncrement: increment },
  });
  const a = createStore();
  const b = createStore();
  b.set($count, 10);
  const h = createHarness();
  const tree = (showA: boolean) => (
    <>
      {showA && (
        <Provider store={a}>
          <Counter name="a" />
        </Provider>
      )}
      <Provider store={b}>
        <Counter name="b" />
      </Provider>
    </>
  );
  expect(active).toBe(0);
  await h.render(tree(true));
  expect(active).toBe(2);
  await act(async () => h.container.querySelector<HTMLButtonElement>('[data-name="a"]')!.click());
  expect(h.container.querySelector('[data-name="a"]')?.textContent).toBe('1');
  expect(h.container.querySelector('[data-name="b"]')?.textContent).toBe('10');
  await h.render(tree(false));
  expect(active).toBe(1);
  await act(async () => h.container.querySelector<HTMLButtonElement>('[data-name="b"]')!.click());
  expect(a.get($count)).toBe(1);
  expect(b.get($count)).toBe(11);
  await h.unmount();
  expect(active).toBe(0);
});

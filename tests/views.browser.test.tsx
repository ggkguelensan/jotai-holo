import { atom, createStore, Provider } from 'jotai';
import { act, useState } from 'react';
import { expect, test } from 'vitest';
import { holo, holoList, holoMatch } from '../src/index.js';
import { createHarness, deferred, ErrorBoundary, suspense } from './browser-harness.js';

test('list preserves keyed local state on reorder and renders only changed rows', async () => {
  type Item = { id: string; title: string };
  const a = { id: 'a', title: 'Ada' };
  const b = { id: 'b', title: 'Bob' };
  const $items = atom<Item[]>([a, b]);
  const store = createStore();
  const renders: Record<string, number> = {};
  const mounts: string[] = [];
  const unmounts: string[] = [];
  const List = holoList({
    source: $items,
    getKey: (item) => item.id,
    mapItem: (item) => ({ item }),
    view: function Row({ item, title }: { item: Item; title: string }) {
      const [n, setN] = useState(0);
      renders[item.id] = (renders[item.id] ?? 0) + 1;
      return (
        <button data-id={item.id} onClick={() => setN(n + 1)}>
          {title}:{item.title}:{n}
        </button>
      );
    },
    props: { title: 'User' },
    lifecycle: {
      onMount(_get, _set, ctx) {
        mounts.push(ctx.input.item.id);
      },
      onUnmount(_get, _set, ctx) {
        unmounts.push(ctx.input.item.id);
      },
    },
    empty: () => <span>empty</span>,
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <List />
    </Provider>,
  );
  await act(async () => h.container.querySelector<HTMLButtonElement>('[data-id=a]')!.click());
  const before = { ...renders };
  await act(async () => store.set($items, [b, a]));
  expect(renders).toEqual(before);
  expect([...h.container.querySelectorAll('button')].map((node) => node.textContent)).toEqual([
    'User:Bob:0',
    'User:Ada:1',
  ]);
  await act(async () => store.set($items, [b, { ...a, title: 'Alice' }]));
  expect(renders.b).toBe(before.b);
  expect(renders.a).toBe(before.a! + 1);
  expect(mounts).toEqual(['a', 'b']);
  await act(async () => store.set($items, []));
  expect(h.container.textContent).toBe('empty');
  expect(unmounts.sort()).toEqual(['a', 'b']);
});

test('list supports native async sources and reports duplicate keys', async () => {
  const pending = deferred<readonly number[]>();
  const store = createStore();
  const $items = atom(pending.promise);
  const List = holoList({
    source: $items,
    view: ({ value }: { value: number }) => <span>{value}</span>,
    getKey: (value) => value,
    mapItem: (value) => ({ value }),
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <ErrorBoundary>{suspense(<List />)}</ErrorBoundary>
    </Provider>,
  );
  expect(h.container.textContent).toBe('loading');
  await act(async () => pending.resolve([1, 2]));
  expect(h.container.textContent).toBe('12');
  await act(async () => store.set($items, Promise.resolve([1, 1])));
  expect(h.container.textContent).toBe('error');
  expect(String(h.caught[0])).toContain('duplicate key');
});

test('match subscribes only the active branch and resets local state across cases', async () => {
  const $status = atom<'a' | 'b'>('a');
  const $a = atom(0);
  const $b = atom(0);
  const store = createStore();
  const active = { a: 0, b: 0 };
  $a.onMount = () => {
    active.a++;
    return () => {
      active.a--;
    };
  };
  $b.onMount = () => {
    active.b++;
    return () => {
      active.b--;
    };
  };
  const A = holo({
    view: ({ count }: { count: number }) => <span>a:{count}</span>,
    read: { count: $a },
  });
  const B = holo({
    view: ({ count }: { count: number }) => <span>b:{count}</span>,
    read: { count: $b },
  });
  const Page = holoMatch({ source: $status, cases: { a: A, b: B } });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Page />
    </Provider>,
  );
  expect(active).toEqual({ a: 1, b: 0 });
  await act(async () => store.set($status, 'b'));
  expect(active).toEqual({ a: 0, b: 1 });
  expect(h.container.textContent).toBe('b:0');
  const Shared = () => {
    const [n, setN] = useState(0);
    return <button onClick={() => setN(n + 1)}>{n}</button>;
  };
  const Switch = holoMatch({ source: $status, cases: { a: Shared, b: Shared } });
  await h.render(
    <Provider store={store}>
      <Switch />
    </Provider>,
  );
  await act(async () => h.container.querySelector('button')!.click());
  expect(h.container.textContent).toBe('1');
  await act(async () => store.set($status, 'a'));
  expect(h.container.textContent).toBe('0');
});

test('match resolves async selection and preserves fallback identity between unknown values', async () => {
  const pending = deferred<string>();
  const $status = atom<string | Promise<string>>(pending.promise);
  const store = createStore();
  const Fallback = ({ title }: { title: string }) => {
    const [n, setN] = useState(0);
    return (
      <button onClick={() => setN(n + 1)}>
        {title}:{n}
      </button>
    );
  };
  const Page = holoMatch({
    source: $status,
    cases: { ready: ({ title }: { title: string }) => <span>{title}</span> },
    fallback: Fallback,
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<Page title="page" />)}</Provider>);
  await act(async () => pending.resolve('unknown'));
  await act(async () => h.container.querySelector('button')!.click());
  await act(async () => store.set($status, 'other'));
  expect(h.container.textContent).toBe('page:1');
  await act(async () => store.set($status, 'ready'));
  expect(h.container.textContent).toBe('page');
});

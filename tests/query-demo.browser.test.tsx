import { QueryClient } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { act, Profiler } from 'react';
import { expect, test, vi } from 'vitest';
import CatalogDemo, { $$gameQuery, gameDetailQO } from '../examples/docs/query.js';
import { queryClientAtom } from '../src/query.js';
import { createHarness, deferred } from './browser-harness.js';

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join('') }),
}));

const starfall = { id: 'starfall', name: 'Starfall', price: 25 };
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test('the actual catalog example switches from loading to ready and changes games', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const store = createStore();
  store.set(queryClientAtom, client);
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <CatalogDemo />
    </Provider>,
  );
  expect(h.container.textContent).toContain('Loading…');
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  expect(h.container.textContent).toContain('Starfall · $25');
  await act(async () => {
    h.container.querySelectorAll('button')[1]!.click();
  });
  expect(h.container.textContent).toContain('Loading…');
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  expect(h.container.textContent).toContain('Moon Harbor · $15');
  await h.unmount();
  client.clear();
});

test('screen ignores background fetching and renders error, empty and recovered branches', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } },
  });
  const options = gameDetailQO({ gameId: 'starfall' });
  client.setQueryData(options.queryKey, starfall);
  const store = createStore();
  store.set(queryClientAtom, client);
  const h = createHarness();
  const committed = vi.fn();
  await h.render(
    <Provider store={store}>
      <Profiler id="catalog" onRender={committed}>
        <CatalogDemo />
      </Profiler>
    </Provider>,
  );
  const commitsBefore = committed.mock.calls.length;
  const card = h.container.querySelector('[role="status"]');
  const screenChanged = vi.fn();
  const stop = store.sub($$gameQuery.$screen, screenChanged);
  const pending = deferred<typeof starfall>();
  let refetch!: Promise<typeof starfall | null>;
  await act(async () => {
    refetch = client.fetchQuery({ ...options, staleTime: 0, queryFn: () => pending.promise });
    await settle();
  });
  expect(store.get($$gameQuery.$refreshing)).toBe(true);
  expect(store.get($$gameQuery.$screen)).toBe('ready');
  expect(screenChanged).not.toHaveBeenCalled();
  expect(committed).toHaveBeenCalledTimes(commitsBefore);
  expect(h.container.querySelector('[role="status"]')).toBe(card);
  await act(async () => {
    pending.resolve(starfall);
    await refetch;
    await settle();
  });
  expect(screenChanged).not.toHaveBeenCalled();
  expect(committed).toHaveBeenCalledTimes(commitsBefore);
  await act(async () => {
    await client
      .fetchQuery({
        ...options,
        staleTime: 0,
        queryFn: () => Promise.reject(new Error('Catalog unavailable')),
      })
      .catch(() => {});
    await settle();
  });
  expect(store.get($$gameQuery.$screen)).toBe('error');
  expect(h.container.querySelector('[role="alert"]')?.textContent).toBe(
    'Could not load. Try again.',
  );
  await act(async () => {
    client.setQueryData(options.queryKey, null);
    await settle();
  });
  expect(store.get($$gameQuery.$screen)).toBe('empty');
  expect(h.container.textContent).toContain('Game not found.');
  await act(async () => {
    client.setQueryData(options.queryKey, starfall);
    await settle();
  });
  expect(h.container.textContent).toContain('Starfall · $25');
  stop();
  await h.unmount();
  expect(
    client.getQueryCache().find({ queryKey: options.queryKey })?.getObserversCount() ?? 0,
  ).toBe(0);
  client.clear();
});

test('catalog controls expose empty and error states and recover to a game', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const store = createStore();
  store.set(queryClientAtom, client);
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <CatalogDemo />
    </Provider>,
  );
  for (const [index, expected] of [
    [2, 'Game not found.'],
    [3, 'Could not load. Try again.'],
    [1, 'Moon Harbor · $15'],
  ] as const) {
    const button = h.container.querySelectorAll('button')[index]!;
    await act(async () => button.click());
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(h.container.textContent).toContain(expected);
  }
  await h.unmount();
  client.clear();
});

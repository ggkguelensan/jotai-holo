import { QueryClient } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { act, Profiler } from 'react';
import { expect, test, vi } from 'vitest';
import CatalogDemo, { $$productQuery, productDetailQO } from '../examples/docs/query.js';
import { queryClientAtom } from '../src/query.js';
import { createHarness, deferred } from './browser-harness.js';

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join('') }),
}));

const desk = { id: 'desk', name: 'Oak desk', price: 240 };
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test('the actual catalog example switches from loading to ready and changes products', async () => {
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
  expect(h.container.textContent).toContain('Oak desk · $240');
  await act(async () => {
    h.container.querySelectorAll('button')[1]!.click();
  });
  expect(h.container.textContent).toContain('Loading…');
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  expect(h.container.textContent).toContain('Desk lamp · $45');
  await h.unmount();
  client.clear();
});

test('screen ignores background fetching and renders error, empty and recovered branches', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } },
  });
  const options = productDetailQO({ productId: 'desk' });
  client.setQueryData(options.queryKey, desk);
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
  const stop = store.sub($$productQuery.$screen, screenChanged);
  const pending = deferred<typeof desk>();
  let refetch!: Promise<typeof desk | null>;
  await act(async () => {
    refetch = client.fetchQuery({ ...options, staleTime: 0, queryFn: () => pending.promise });
    await settle();
  });
  expect(store.get($$productQuery.$refreshing)).toBe(true);
  expect(store.get($$productQuery.$screen)).toBe('ready');
  expect(screenChanged).not.toHaveBeenCalled();
  expect(committed).toHaveBeenCalledTimes(commitsBefore);
  expect(h.container.querySelector('[role="status"]')).toBe(card);
  await act(async () => {
    pending.resolve(desk);
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
  expect(store.get($$productQuery.$screen)).toBe('error');
  expect(h.container.querySelector('[role="alert"]')?.textContent).toBe('Catalog unavailable');
  await act(async () => {
    client.setQueryData(options.queryKey, null);
    await settle();
  });
  expect(store.get($$productQuery.$screen)).toBe('empty');
  expect(h.container.textContent).toContain('Product not found.');
  await act(async () => {
    client.setQueryData(options.queryKey, desk);
    await settle();
  });
  expect(h.container.textContent).toContain('Oak desk · $240');
  stop();
  await h.unmount();
  expect(
    client.getQueryCache().find({ queryKey: options.queryKey })?.getObserversCount() ?? 0,
  ).toBe(0);
  client.clear();
});

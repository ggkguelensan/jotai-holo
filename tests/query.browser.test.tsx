import { QueryClient, QueryClientProvider, queryOptions, useQuery } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { expect, test, vi } from 'vitest';
import { holo } from '../src/holo.js';
import { queryModel, queryClientAtom } from '../src/query.js';
import { createHarness, deferred } from './browser-harness.js';

test('factory queries share native useQuery cache and data-only holo skips refetch renders', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } },
  });
  const pending = deferred<{ name: string }>();
  const fetch = vi.fn(() => pending.promise);
  const detailQO = ({ id }: { id: string }) =>
    queryOptions({ queryKey: ['users', { id }], queryFn: fetch });
  client.setQueryData(detailQO({ id: 'one' }).queryKey, { name: 'Ada' });
  const query = queryModel({
    query: () => detailQO({ id: 'one' }),
    prism: { $user: (r) => r.data },
  });
  let renders = 0;
  const User = holo({
    view: ({ user }: { user: { name: string } | undefined }) => {
      renders++;
      return <output>{user?.name}</output>;
    },
    read: { user: query.$user },
  });
  function Native() {
    return <span>{useQuery(detailQO({ id: 'one' })).data?.name}</span>;
  }
  const store = createStore();
  store.set(queryClientAtom, client);
  const h = createHarness();
  await h.render(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <User />
        <Native />
      </Provider>
    </QueryClientProvider>,
  );
  const before = renders;
  let refetch!: Promise<void>;
  await act(async () => {
    refetch = client.refetchQueries(detailQO({ id: 'one' }));
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(renders).toBe(before);
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve({ name: 'Ada' });
    await refetch;
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(renders).toBe(before);
  await act(async () => {
    client.setQueryData(detailQO({ id: 'one' }).queryKey, { name: 'Grace' });
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(h.container.textContent).toBe('GraceGrace');
  expect(renders).toBe(before + 1);
  await h.unmount();
  expect(
    client
      .getQueryCache()
      .findAll()
      .reduce((n, q) => n + q.getObserversCount(), 0),
  ).toBe(0);
  client.clear();
});

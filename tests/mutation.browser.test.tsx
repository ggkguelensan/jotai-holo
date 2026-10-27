import {
  MutationObserver,
  QueryClient,
  mutationOptions,
  QueryClientProvider,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { act, StrictMode, Suspense, useLayoutEffect } from 'react';
import { expect, test, vi } from 'vitest';
import { holo } from '../src/holo.js';
import { mutationAtoms, queryClientAtom } from '../src/query.js';
import { createHarness, deferred } from './browser-harness.js';

test('holo commits only changed projections, shares native Query cache and releases subscriptions', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const pending = deferred<{ name: string }>();
  const detailQO = queryOptions({
    queryKey: ['proposal'],
    queryFn: async () => ({ name: 'Draft' }),
  });
  client.setQueryData(detailQO.queryKey, { name: 'Draft' });
  const saving = mutationAtoms({
    mutation: () =>
      mutationOptions({
        mutationKey: ['proposal', 'save'],
        mutationFn: (_input: string) => pending.promise,
        onSuccess: (data) => {
          client.setQueryData(detailQO.queryKey, data);
        },
      }),
    prism: { $data: (r) => r.data, $pending: (r) => r.isPending },
  });
  let dataCommits = 0;
  let pendingCommits = 0;
  const Data = holo({
    core: ({ data }: { data: { name: string } | undefined }) => {
      useLayoutEffect(() => {
        dataCommits++;
      });
      return <output data-result>{data?.name ?? 'Empty'}</output>;
    },
    state: { data: saving.$data },
  });
  const Pending = holo({
    core: ({ pending }: { pending: boolean }) => {
      useLayoutEffect(() => {
        pendingCommits++;
      });
      return <output data-pending>{String(pending)}</output>;
    },
    state: { pending: saving.$pending },
  });
  function Native() {
    return <span data-native>{useQuery(detailQO).data?.name}</span>;
  }
  const store = createStore();
  store.set(queryClientAtom, client);
  const h = createHarness();
  await h.render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <Provider store={store}>
          <Suspense fallback={<b data-fallback>Loading</b>}>
            <Data />
            <Pending />
            <Native />
          </Suspense>
        </Provider>
      </QueryClientProvider>
    </StrictMode>,
  );
  const beforeData = dataCommits;
  const beforePending = pendingCommits;
  let execution!: Promise<{ name: string }>;
  await act(async () => {
    execution = store.set(saving.mutate, 'Saved');
  });
  expect(dataCommits).toBe(beforeData);
  expect(pendingCommits).toBe(beforePending + 1);
  expect(h.container.querySelector('[data-pending]')?.textContent).toBe('true');
  await act(async () => {
    pending.resolve({ name: 'Saved' });
    await execution;
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(dataCommits).toBe(beforeData + 1);
  expect(pendingCommits).toBe(beforePending + 2);
  expect(h.container.querySelector('[data-result]')?.textContent).toBe('Saved');
  expect(h.container.querySelector('[data-native]')?.textContent).toBe('Saved');
  expect(h.container.querySelector('[data-fallback]')).toBeNull();
  await h.unmount();
  await new Promise((r) => setTimeout(r, 10));
  expect(client.getMutationCache().getAll()).toHaveLength(0);
  client.clear();
});

test('unmount during save does not cancel and remount reads its completed state', async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
  const pending = deferred<number>();
  const saving = mutationAtoms({
    client,
    mutation: () => mutationOptions({ mutationFn: async () => pending.promise }),
    prism: { $data: (r) => r.data },
  });
  const Connected = holo({
    core: ({ value }: { value: number | undefined }) => <output>{value ?? 'Empty'}</output>,
    state: { value: saving.$data },
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Connected />
    </Provider>,
  );
  let execution!: Promise<number>;
  await act(async () => {
    execution = store.set(saving.mutate);
  });
  await h.unmount();
  pending.resolve(42);
  await execution;
  expect(store.get(saving.$data)).toBe(42);
  const next = createHarness();
  await next.render(
    <Provider store={store}>
      <Connected />
    </Provider>,
  );
  expect(next.container.textContent).toBe('42');
  await next.unmount();
  client.clear();
});

test('an abandoned Suspense render creates no subscription or execution', async () => {
  const subscribe = vi.spyOn(MutationObserver.prototype, 'subscribe');
  const client = new QueryClient();
  let executions = 0;
  const saving = mutationAtoms({
    client,
    mutation: () => mutationOptions({ mutationFn: async () => ++executions }),
    prism: { $data: (r) => r.data },
  });
  const Connected = holo({
    core: ({ value }: { value: number | undefined }) => <output>{value}</output>,
    state: { value: saving.$data },
  });
  const gate = deferred<void>();
  function Blocked(): never {
    throw gate.promise;
  }
  const h = createHarness();
  await h.render(
    <Suspense fallback={<b>Waiting</b>}>
      <Connected />
      <Blocked />
    </Suspense>,
  );
  expect(h.container.textContent).toBe('Waiting');
  expect(executions).toBe(0);
  expect(subscribe).not.toHaveBeenCalled();
  subscribe.mockRestore();
  expect(client.getMutationCache().getAll()).toHaveLength(0);
  await h.unmount();
  client.clear();
});

import { QueryClient, queryOptions, skipToken } from '@tanstack/react-query';
import { atom, createStore } from 'jotai/vanilla';
import { afterEach, expect, expectTypeOf, test, vi } from 'vitest';
import { queryModel, queryClientAtom } from '../src/query.js';

const clients: QueryClient[] = [];
const client = () => {
  const value = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(value);
  return value;
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
});

test('declaration is lazy, reads do not fetch, mounted projections share one observer and clean it up', async () => {
  const cache = client();
  const fetch = vi.fn(async () => ({ name: 'Anna' }));
  const options = vi.fn(() => queryOptions({ queryKey: ['user'], queryFn: fetch }));
  const unused = vi.fn(() => {
    throw new Error('unused projection');
  });
  const query = queryModel({
    query: options,
    client: cache,
    prism: {
      $name: (result) => result.data?.name,
      $pending: (result) => result.isPending,
      $unused: unused,
    },
  });
  expect(options).not.toHaveBeenCalled();
  const store = createStore();
  expect(store.get(query.$name)).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
  const stopName = store.sub(query.$name, () => {});
  const stopPending = store.sub(query.$pending, () => {});
  await tick();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(store.get(query.$name)).toBe('Anna');
  expect(store.get(query.$pending)).toBe(false);
  const observed = cache.getQueryCache().find({ queryKey: ['user'] })!;
  expect(observed.getObserversCount()).toBe(1);
  stopName();
  expect(observed.getObserversCount()).toBe(1);
  stopPending();
  expect(observed.getObserversCount()).toBe(0);
  expect(unused).not.toHaveBeenCalled();
});

test('reactive factory parameters switch query keys while preserving a single active observer', async () => {
  const cache = client();
  const $id = atom('one');
  const detailQO = ({ id }: { id: string }) =>
    queryOptions({ queryKey: ['user', { id }] as const, queryFn: async () => ({ id }) });
  const query = queryModel({
    state: { id: $id },
    query: detailQO,
    client: cache,
    prism: { $user: (result) => result.data },
  });
  const store = createStore();
  const stop = store.sub(query.$user, () => {});
  await tick();
  expect(store.get(query.$user)).toEqual({ id: 'one' });
  store.set($id, 'two');
  await tick();
  expect(store.get(query.$user)).toEqual({ id: 'two' });
  expect(
    cache
      .getQueryCache()
      .findAll()
      .reduce((n, query) => n + query.getObserversCount(), 0),
  ).toBe(1);
  stop();
});

test('data consumers ignore fetching-only updates and unchanged refetch data', async () => {
  const cache = client();
  const key = ['same'] as const;
  cache.setQueryData(key, { name: 'Anna' });
  let resolve!: (data: { name: string }) => void;
  const query = queryModel({
    query: () =>
      queryOptions({
        queryKey: key,
        staleTime: Infinity,
        queryFn: () =>
          new Promise<{ name: string }>((done) => {
            resolve = done;
          }),
      }),
    client: cache,
    prism: { $data: (result) => result.data, $fetching: (result) => result.isFetching },
  });
  const store = createStore();
  const changed = vi.fn();
  const fetching = vi.fn();
  const stop = store.sub(query.$data, changed);
  const stopFetching = store.sub(query.$fetching, fetching);
  const pending = cache.refetchQueries({ queryKey: key });
  await tick();
  expect(changed).not.toHaveBeenCalled();
  expect(store.get(query.$fetching)).toBe(true);
  resolve({ name: 'Anna' });
  await pending;
  await tick();
  expect(changed).not.toHaveBeenCalled();
  expect(fetching).toHaveBeenCalledTimes(2);
  cache.setQueryData(key, { name: 'Boris' });
  await tick();
  expect(changed).toHaveBeenCalledTimes(1);
  stop();
  stopFetching();
});

test('client replacement and stores isolate observers, snapshots and selected data', async () => {
  const first = client();
  const second = client();
  const key = ['user'];
  first.setQueryData(key, { name: 'First' });
  second.setQueryData(key, { name: 'Second' });
  const query = queryModel({
    query: () =>
      queryOptions({
        queryKey: key,
        staleTime: Infinity,
        queryFn: async () => ({ name: 'remote' }),
      }),
    prism: { $name: (result) => result.data?.name },
  });
  const a = createStore();
  const b = createStore();
  a.set(queryClientAtom, first);
  b.set(queryClientAtom, second);
  const notifyB = vi.fn();
  const stopA = a.sub(query.$name, () => {});
  const stopB = b.sub(query.$name, notifyB);
  expect(a.get(query.$name)).toBe('First');
  expect(b.get(query.$name)).toBe('Second');
  a.set(queryClientAtom, second);
  await tick();
  expect(a.get(query.$name)).toBe('Second');
  expect(first.getQueryCache().find({ queryKey: key })?.getObserversCount() ?? 0).toBe(0);
  expect(second.getQueryCache().find({ queryKey: key })!.getObserversCount()).toBe(2);
  expect(notifyB).not.toHaveBeenCalled();
  stopA();
  stopB();
});

test('skipToken and enabled preserve native blocking, and a later enabled state starts fetching', async () => {
  const cache = client();
  const $enabled = atom(false);
  const fetch = vi.fn(async () => 1);
  const query = queryModel({
    state: { enabled: $enabled },
    query: ({ enabled }) => queryOptions({ queryKey: ['enabled'], enabled, queryFn: fetch }),
    client: cache,
    prism: { $data: (result) => result.data },
  });
  const skipped = queryModel({
    query: () => queryOptions({ queryKey: ['unavailable'], queryFn: skipToken }),
    client: cache,
    prism: { $data: (result) => result.data },
  });
  const store = createStore();
  const stops = [store.sub(query.$data, () => {}), store.sub(skipped.$data, () => {})];
  await tick();
  expect(fetch).not.toHaveBeenCalled();
  store.set($enabled, true);
  await tick();
  expect(store.get(query.$data)).toBe(1);
  stops.forEach((stop) => stop());
});

test('background errors retain data and errors remain typed without implicit throwing', async () => {
  const cache = client();
  const error = new Error('offline');
  cache.setQueryData(['user'], { name: 'Anna' });
  const query = queryModel({
    query: () =>
      queryOptions({
        queryKey: ['user'],
        queryFn: async () => {
          throw error;
        },
        initialData: { name: 'Anna' },
        select: (data) => data.name,
      }),
    client: cache,
    prism: { $name: (result) => result.data, $error: (result) => result.error },
  });
  const store = createStore();
  const stop = store.sub(query.$name, () => {});
  await tick();
  expect(store.get(query.$name)).toBe('Anna');
  expect(store.get(query.$error)).toBe(error);
  expectTypeOf(query.$name).toEqualTypeOf<import('jotai').Atom<string | undefined>>();
  stop();
});

test('key replacement and last unsubscribe abort consumed signals; late responses cannot replace current data', async () => {
  const cache = client();
  const $id = atom('one');
  const signals = new Map<string, AbortSignal>();
  const finish = new Map<string, (value: string) => void>();
  const query = queryModel({
    state: { id: $id },
    client: cache,
    query: ({ id }) =>
      queryOptions({
        queryKey: ['slow', id],
        queryFn: ({ signal }) => {
          signals.set(id, signal);
          return new Promise<string>((resolve) => finish.set(id, resolve));
        },
      }),
    prism: { $data: (r) => r.data },
  });
  const store = createStore();
  const stop = store.sub(query.$data, () => {});
  expect(signals.get('one')?.aborted).toBe(false);
  store.set($id, 'two');
  expect(signals.get('one')?.aborted).toBe(true);
  finish.get('two')!('second');
  await tick();
  finish.get('one')!('obsolete');
  await tick();
  expect(store.get(query.$data)).toBe('second');
  store.set($id, 'three');
  expect(signals.get('three')?.aborted).toBe(false);
  stop();
  expect(signals.get('three')?.aborted).toBe(true);
});

test('mount reconciles cache updates made while detached and native hydration provides an initial value', async () => {
  const { dehydrate, hydrate } = await import('@tanstack/query-core');
  const server = client();
  const browser = client();
  const key = ['hydrated'];
  server.setQueryData(key, { name: 'Server' });
  hydrate(browser, dehydrate(server));
  const query = queryModel({
    client: browser,
    query: () =>
      queryOptions({
        queryKey: key,
        queryFn: async () => ({ name: 'Remote' }),
        staleTime: Infinity,
        gcTime: Infinity,
      }),
    prism: { $name: (r) => r.data?.name },
  });
  const store = createStore();
  expect(store.get(query.$name)).toBe('Server');
  const stop = store.sub(query.$name, () => {});
  stop();
  browser.setQueryData(key, { name: 'Detached update' });
  const stopAgain = store.sub(query.$name, () => {});
  await tick();
  expect(store.get(query.$name)).toBe('Detached update');
  stopAgain();
});

test('remount after query-cache eviction attaches to a fresh cache entry and refetches', async () => {
  const cache = client();
  let value = 'First';
  const fetch = vi.fn(async () => value);
  const options = () =>
    queryOptions({ queryKey: ['evicted'], queryFn: fetch, staleTime: Infinity, gcTime: 0 });
  const query = queryModel({ client: cache, query: options, prism: { $data: (r) => r.data } });
  const store = createStore();
  const stop = store.sub(query.$data, () => {});
  await tick();
  expect(store.get(query.$data)).toBe('First');
  stop();
  await tick();
  expect(cache.getQueryCache().find({ queryKey: options().queryKey })).toBeUndefined();
  value = 'Second';
  const stopAgain = store.sub(query.$data, () => {});
  await tick();
  expect(store.get(query.$data)).toBe('Second');
  expect(cache.getQueryCache().find({ queryKey: options().queryKey })?.getObserversCount()).toBe(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  stopAgain();
});

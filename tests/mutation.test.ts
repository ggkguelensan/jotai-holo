import {
  MutationCache,
  MutationObserver,
  QueryClient,
  mutationOptions,
  onlineManager,
} from '@tanstack/react-query';
import { atom, createStore, type Atom, type WritableAtom } from 'jotai/vanilla';
import { afterEach, expect, expectTypeOf, test, vi } from 'vitest';
import { createMutationModel, queryClientAtom } from '../src/query.js';
import { actionAtom } from '../src/action-atom.js';
import { eventAtom } from '../src/event-atom.js';
import { bond } from '../src/bond.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const clients: QueryClient[] = [];
function client() {
  const result = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: 0 } },
  });
  clients.push(result);
  return result;
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
afterEach(() => {
  clients.splice(0).forEach((value) => value.clear());
  onlineManager.setOnline(true);
  vi.restoreAllMocks();
});

function fixture(cache = client()) {
  const calls: ReturnType<typeof deferred<number>>[] = [];
  const factory = vi.fn(() =>
    mutationOptions({
      mutationKey: ['save'],
      mutationFn: (_input: number) => {
        const call = deferred<number>();
        calls.push(call);
        return call.promise;
      },
    }),
  );
  const unused = vi.fn(() => {
    throw new Error('unused projection');
  });
  const saving = createMutationModel({
    client: cache,
    mutation: factory,
    prism: {
      $data: (r) => r.data,
      $pending: (r) => r.isPending,
      $error: (r) => r.error,
      $status: (r) => r.status,
      $variables: (r) => r.variables,
      $unused: unused,
    },
  });
  return { cache, factory, calls, saving, unused, store: createStore() };
}

test('lazy initialization, independent selectors, native factory types, no React required', async () => {
  const f = fixture();
  expect(f.factory).not.toHaveBeenCalled();
  expect(f.cache.getMutationCache().getAll()).toHaveLength(0);
  expect(f.store.get(f.saving.$status)).toBe('idle');
  expect(f.factory).toHaveBeenCalledTimes(1);
  expect(f.calls).toHaveLength(0);
  expectTypeOf(f.saving.$data).toEqualTypeOf<Atom<number | undefined>>();
  expectTypeOf(f.saving.$error).toEqualTypeOf<Atom<Error | null>>();
  expectTypeOf(f.saving.mutate).toMatchTypeOf<WritableAtom<null, [number], Promise<number>>>();
  const pending = f.store.set(f.saving.mutate, 4);
  expect(f.store.get(f.saving.$pending)).toBe(true);
  expect(f.store.get(f.saving.$variables)).toBe(4);
  await tick();
  f.calls[0]!.resolve(8);
  expect(await pending).toBe(8);
  expect(f.store.get(f.saving.$data)).toBe(8);
  expect(f.store.get(f.saving.$pending)).toBe(false);
  expect(f.factory).toHaveBeenCalledTimes(1);
  expect(f.unused).not.toHaveBeenCalled();
});

test('one observer listener serves projections and active calls; no listener after last owner', async () => {
  const subscribe = vi.spyOn(MutationObserver.prototype, 'subscribe');
  const f = fixture();
  const stopData = f.store.sub(f.saving.$data, () => {});
  const stopPending = f.store.sub(f.saving.$pending, () => {});
  expect(subscribe).toHaveBeenCalledTimes(1);
  const promise = f.store.set(f.saving.mutate, 1);
  await tick();
  const observer = subscribe.mock.instances[0]! as MutationObserver;
  expect(observer.hasListeners()).toBe(true);
  stopData();
  stopPending();
  expect(observer.hasListeners()).toBe(true);
  f.calls[0]!.resolve(2);
  await promise;
  expect(observer.hasListeners()).toBe(false);
  const stop = f.store.sub(f.saving.$data, () => {});
  expect(f.store.get(f.saving.$data)).toBe(2);
  stop();
  expect(observer.hasListeners()).toBe(false);
  await vi.waitFor(() => expect(f.cache.getMutationCache().getAll()).toHaveLength(0));
});

test.each([true, false])(
  'parallel calls preserve each Promise; latest start wins (reverse=%s)',
  async (reverse) => {
    const f = fixture();
    const first = f.store.set(f.saving.mutate, 1);
    const second = f.store.set(f.saving.mutate, 2);
    await tick();
    if (reverse) {
      f.calls[1]!.resolve(20);
      expect(await second).toBe(20);
      expect(f.store.get(f.saving.$pending)).toBe(false);
      f.calls[0]!.resolve(10);
    } else {
      f.calls[0]!.resolve(10);
      await first;
      expect(f.store.get(f.saving.$pending)).toBe(true);
      f.calls[1]!.resolve(20);
    }
    expect(await first).toBe(10);
    expect(await second).toBe(20);
    expect(f.store.get(f.saving.$data)).toBe(20);
  },
);

test('a stale rejection never overwrites a newer success', async () => {
  const f = fixture();
  const error = new Error('first failed');
  const first = f.store.set(f.saving.mutate, 1);
  const rejected = expect(first).rejects.toBe(error);
  const second = f.store.set(f.saving.mutate, 2);
  await tick();
  f.calls[1]!.resolve(20);
  await second;
  f.calls[0]!.reject(error);
  await rejected;
  expect(f.store.get(f.saving.$error)).toBeNull();
  expect(f.store.get(f.saving.$data)).toBe(20);
});

test('reset detaches an in-flight call without cancelling its Promise or restoring old data', async () => {
  const f = fixture();
  const first = f.store.set(f.saving.mutate, 1);
  await tick();
  f.store.set(f.saving.reset);
  expect(f.store.get(f.saving.$status)).toBe('idle');
  expect(f.store.get(f.saving.$variables)).toBeUndefined();
  const second = f.store.set(f.saving.mutate, 2);
  await tick();
  f.calls[1]!.resolve(20);
  await second;
  f.calls[0]!.resolve(10);
  expect(await first).toBe(10);
  expect(f.store.get(f.saving.$data)).toBe(20);
  f.store.set(f.saving.reset);
  expect(f.store.get(f.saving.$data)).toBeUndefined();
});

test('errors are values, reject the Promise, and release execution ownership', async () => {
  const f = fixture();
  const promise = f.store.set(f.saving.mutate, 1);
  const error = new Error('offline');
  const rejected = expect(promise).rejects.toBe(error);
  await tick();
  f.calls[0]!.reject(error);
  await rejected;
  expect(f.store.get(f.saving.$error)).toBe(error);
  expect(f.store.get(f.saving.$pending)).toBe(false);
  await vi.waitFor(() => expect(f.cache.getMutationCache().getAll()).toHaveLength(0));
});

test('void/optional variables and absent prism require no extra arguments', async () => {
  const cache = client();
  const store = createStore();
  store.set(queryClientAtom, cache);
  const empty = createMutationModel({
    mutation: () => mutationOptions({ mutationFn: async () => 7 }),
  });
  expect(await store.set(empty.mutate)).toBe(7);
  store.set(empty.reset);
  const optional = createMutationModel({
    mutation: () => mutationOptions({ mutationFn: async (input?: string) => input ?? 'default' }),
  });
  expect(await store.set(optional.mutate)).toBe('default');
  expect(await store.set(optional.mutate, 'set')).toBe('set');
});

test('store and client identities isolate runtime; A → B → A retains the right results', async () => {
  const a = client();
  const b = client();
  const $client = atom<QueryClient | null>(a);
  const calls: { client: QueryClient; pending: ReturnType<typeof deferred<number>> }[] = [];
  const saving = createMutationModel({
    client: $client,
    mutation: () =>
      mutationOptions({
        mutationFn: async (_n: number, ctx) => {
          const pending = deferred<number>();
          calls.push({ client: ctx.client, pending });
          return pending.promise;
        },
      }),
    prism: { $data: (r) => r.data, $pending: (r) => r.isPending },
  });
  const store = createStore();
  const other = createStore();
  const stop = store.sub(saving.$data, () => {});
  const first = store.set(saving.mutate, 1);
  store.set($client, b);
  const second = store.set(saving.mutate, 2);
  const third = other.set(saving.mutate, 3);
  await tick();
  expect(calls.map((c) => c.client)).toEqual([a, b, a]);
  calls[0]!.pending.resolve(10);
  await first;
  expect(store.get(saving.$data)).toBeUndefined();
  calls[1]!.pending.resolve(20);
  await second;
  expect(store.get(saving.$data)).toBe(20);
  store.set($client, a);
  expect(store.get(saving.$data)).toBe(10);
  expect(other.get(saving.$data)).toBeUndefined();
  calls[2]!.pending.resolve(30);
  await third;
  expect(other.get(saving.$data)).toBe(30);
  expect(store.get(saving.$data)).toBe(10);
  stop();
});

test('unchanged selected values do not notify, and unused selectors never execute', async () => {
  const f = fixture();
  const notify = vi.fn();
  const stop = f.store.sub(f.saving.$pending, notify);
  const first = f.store.set(f.saving.mutate, 1);
  const second = f.store.set(f.saving.mutate, 2);
  expect(notify).toHaveBeenCalledTimes(1);
  await tick();
  f.calls[0]!.resolve(10);
  await first;
  expect(notify).toHaveBeenCalledTimes(1);
  f.calls[1]!.resolve(20);
  await second;
  expect(notify).toHaveBeenCalledTimes(2);
  expect(f.unused).not.toHaveBeenCalled();
  stop();
});

test('native callbacks, async onMutate context, optimistic rollback and cache hooks run once', async () => {
  const order: string[] = [];
  const cache = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: () => {
        order.push('cache-success');
      },
      onError: () => {
        order.push('cache-error');
      },
    }),
  });
  clients.push(cache);
  cache.setQueryData(['proposal'], 'old');
  const error = new Error('refused');
  let fail = false;
  const saving = createMutationModel({
    client: cache,
    mutation: () =>
      mutationOptions({
        mutationFn: async (value: string) => {
          if (fail) throw error;
          return value;
        },
        onMutate: async (value) => {
          order.push('optimistic');
          const previous = cache.getQueryData<string>(['proposal']);
          cache.setQueryData(['proposal'], value);
          return { previous };
        },
        onSuccess: async () => {
          await tick();
          order.push('success');
        },
        onError: (_error, _value, context) => {
          order.push('rollback');
          cache.setQueryData(['proposal'], context?.previous);
        },
        onSettled: () => {
          order.push('settled');
        },
      }),
  });
  const store = createStore();
  expect(await store.set(saving.mutate, 'new')).toBe('new');
  expect(order).toEqual(['optimistic', 'cache-success', 'success', 'settled']);
  order.length = 0;
  fail = true;
  await expect(store.set(saving.mutate, 'bad')).rejects.toBe(error);
  expect(cache.getQueryData(['proposal'])).toBe('new');
  expect(order).toEqual(['optimistic', 'cache-error', 'rollback', 'settled']);
});

test('key defaults, retries, meta, scope serialization and paused mutations use query-core semantics', async () => {
  const cache = client();
  cache.mount();
  try {
    let attempts = 0;
    cache.setMutationDefaults(['retry'], {
      retry: 1,
      retryDelay: 0,
      mutationFn: async () => {
        if (++attempts === 1) throw new Error('retry');
        return 5;
      },
    });
    const store = createStore();
    const retrying = createMutationModel({
      client: cache,
      mutation: () => ({ mutationKey: ['retry'] }),
    });
    expect(await store.set(retrying.mutate)).toBe(5);
    expect(attempts).toBe(2);
    const calls: number[] = [];
    const gate = deferred<void>();
    const serial = createMutationModel({
      client: cache,
      mutation: () =>
        mutationOptions({
          scope: { id: 'save' },
          meta: { domain: 'proposal' },
          mutationFn: async (n: number, ctx) => {
            expect(ctx.meta).toEqual({ domain: 'proposal' });
            calls.push(n);
            if (n === 1) await gate.promise;
            return n;
          },
        }),
    });
    const first = store.set(serial.mutate, 1);
    const second = store.set(serial.mutate, 2);
    await tick();
    expect(calls).toEqual([1]);
    gate.resolve();
    await Promise.all([first, second]);
    expect(calls).toEqual([1, 2]);
    onlineManager.setOnline(false);
    const paused = createMutationModel({
      client: cache,
      mutation: () => mutationOptions({ mutationFn: async () => 9 }),
      prism: { $paused: (r) => r.isPaused },
    });
    const pending = store.set(paused.mutate);
    await tick();
    expect(store.get(paused.$paused)).toBe(true);
    onlineManager.setOnline(true);
    expect(await pending).toBe(9);
    expect(store.get(paused.$paused)).toBe(false);
  } finally {
    cache.unmount();
  }
});

test('bond consumes mutate and observes call-time arguments, not successful completion', async () => {
  const f = fixture();
  const requested = eventAtom<number>();
  const $seen = atom(0);
  const observed = actionAtom((_get, set, n: number) => {
    set($seen, n);
  });
  const invoking = bond({ trigger: requested, write: f.saving.mutate });
  const observing = bond({ trigger: f.saving.mutate, write: observed });
  const stopInvoke = invoking.connect(f.store);
  const stopObserve = observing.connect(f.store);
  f.store.set(requested, 3);
  expect(f.store.get($seen)).toBe(3);
  await tick();
  f.calls[0]!.resolve(6);
  await tick();
  expect(f.store.get(f.saving.$data)).toBe(6);
  stopInvoke();
  stopObserve();
});

test('invalid configuration fails clearly without creating a mutation', () => {
  const store = createStore();
  const absent = createMutationModel({ mutation: () => ({}) });
  expect(() => store.set(absent.mutate)).toThrow('provide the application QueryClient');
  for (const throwOnError of [true, () => true]) {
    const saving = createMutationModel({ client: client(), mutation: () => ({ throwOnError }) });
    expect(() => store.set(saving.mutate)).toThrow('throwOnError is unsupported');
  }
  const bad = { mutation: () => ({}), prism: { mutate: () => 1 } };
  // @ts-expect-error Reserved names cannot shadow commands.
  expect(() => createMutationModel(bad)).toThrow('reserved');
});

// Type-only negative assertions must never execute.
function typeChecks() {
  const saving = fixture().saving;
  const store = createStore();
  // @ts-expect-error A number variable is required.
  store.set(saving.mutate);
  // @ts-expect-error Wrong variable type.
  store.set(saving.mutate, 'bad');
  // @ts-expect-error Per-call callback options are deliberately unsupported.
  store.set(saving.mutate, 1, { onSuccess() {} });
}
void typeChecks;

test('reset alone stays idle after a detached call completes', async () => {
  const f = fixture();
  const execution = f.store.set(f.saving.mutate, 1);
  await tick();
  f.store.set(f.saving.reset);
  f.calls[0]!.resolve(9);
  expect(await execution).toBe(9);
  expect(f.store.get(f.saving.$status)).toBe('idle');
  expect(f.store.get(f.saving.$data)).toBeUndefined();
});

test('latest error survives an older success and recovery uses a fresh execution', async () => {
  const f = fixture();
  const first = f.store.set(f.saving.mutate, 1);
  const second = f.store.set(f.saving.mutate, 2);
  const error = new Error('second failed');
  const rejected = expect(second).rejects.toBe(error);
  await tick();
  f.calls[1]!.reject(error);
  await rejected;
  f.calls[0]!.resolve(10);
  await first;
  expect(f.store.get(f.saving.$error)).toBe(error);
  const third = f.store.set(f.saving.mutate, 3);
  expect(f.store.get(f.saving.$error)).toBeNull();
  await tick();
  f.calls[2]!.resolve(30);
  await third;
  expect(f.store.get(f.saving.$data)).toBe(30);
});

test('typed error/context and discriminated snapshots retain native inference', async () => {
  class SaveError extends Error {
    readonly code = 'SAVE';
  }
  const saving = createMutationModel({
    client: client(),
    mutation: () =>
      mutationOptions<number, SaveError, string, { before: string }>({
        mutationFn: async (input) => input.length,
        onMutate: (before) => ({ before }),
      }),
    prism: {
      $error: (r) => r.error,
      $context: (r) => r.context,
      $length: (r) => {
        if (r.isSuccess) {
          expectTypeOf(r.data).toEqualTypeOf<number>();
          return r.data;
        }
        return 0;
      },
    },
  });
  expectTypeOf(saving.$error).toEqualTypeOf<Atom<SaveError | null>>();
  expectTypeOf(saving.$context).toEqualTypeOf<Atom<{ before: string } | undefined>>();
  const store = createStore();
  await store.set(saving.mutate, 'test');
  expect(store.get(saving.$context)).toEqual({ before: 'test' });
});

test('client default throwOnError is rejected instead of silently ignored', () => {
  const cache = client();
  cache.setDefaultOptions({ mutations: { throwOnError: true } });
  const saving = createMutationModel({ client: cache, mutation: () => ({}) });
  expect(() => createStore().set(saving.mutate)).toThrow('throwOnError is unsupported');
});

test('projection snapshots expose state without imperative methods', () => {
  const saving = createMutationModel({
    client: client(),
    mutation: () => ({}),
    prism: { $methods: (r) => 'mutate' in r || 'reset' in r },
  });
  expect(createStore().get(saving.$methods)).toBe(false);
});

test('untyped callers cannot silently pass ignored per-call options', () => {
  const f = fixture();
  expect(() =>
    Reflect.apply(f.store.set, undefined, [f.saving.mutate, 1, { onSuccess() {} }]),
  ).toThrow('per-call options are unsupported');
  expect(f.factory).not.toHaveBeenCalled();
});

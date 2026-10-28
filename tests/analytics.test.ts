import { managedConnection } from '../src/model-managed.js';
import { persist } from '../src/persist.js';
import { atom, createStore } from 'jotai/vanilla';
import { expect, test, vi } from 'vitest';
import { createAnalytics, modelAnalytics } from '../src/analytics.js';
import { createModel, modelLifecycle, modelRegistry, pipe } from '../src/model.js';
import { actionAtom, bond, eventAtom, stateAtom } from '../src/vanilla.js';

const tick = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function createSearchModel() {
  const $category = stateAtom('chairs');
  const completed = eventAtom<{ query: string; results: number }>();
  return { $category, completed };
}

test('declarations and reads do not load factories; modifiers flatten either side of registry', async () => {
  const create = vi.fn(createSearchModel);
  const load = vi.fn(async () => (model: ReturnType<typeof createSearchModel>) => ({}));
  const $$search = pipe(
    create,
    modelRegistry(),
    modelAnalytics(load),
    modelRegistry({ retainTime: 0 }),
  );
  const store = createStore();
  const selected = $$search({ key: ['search'] });
  expect(create).not.toHaveBeenCalled();
  store.get(selected);
  expect(load).not.toHaveBeenCalled();
  const lease = $$search.acquire(store, { key: ['search'] });
  await tick();
  expect(create).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledTimes(1);
  lease.release();
});

test('managed facts route only to selected engines, with independent inline mappings and snapshots', async () => {
  const amplitude = vi.fn();
  const warehouse = vi.fn();
  const unused = vi.fn(() => ({ send: vi.fn() }));
  const analytics = createAnalytics({
    engines: {
      amplitude: () => ({ send: amplitude }),
      warehouse: () => ({ send: warehouse }),
      unused,
    },
  });
  const $$search = pipe(
    createSearchModel,
    modelAnalytics(async () => (search) => ({
      completed: analytics.event({
        trigger: search.completed,
        state: { category: search.$category },
        map: {
          amplitude: ({ category }, fact) => ({ category, query: fact.query }),
          warehouse: (_state, fact) => ({ count: fact.results }),
        },
      }),
    })),
    modelRegistry(),
  );
  const store = createStore();
  const a = $$search.acquire(store);
  const b = $$search.acquire(store);
  await tick();
  const fact = { query: 'desk', results: 2 };
  store.set(a.model.completed, fact);
  fact.query = 'mutated';
  store.set(a.model.$category, 'tables');
  await analytics.flush(store);
  expect(amplitude.mock.calls[0]![0]).toEqual({ category: 'chairs', query: 'desk' });
  expect(warehouse.mock.calls[0]![0]).toEqual({ count: 2 });
  expect(unused).not.toHaveBeenCalled();
  a.release();
  store.set(b.model.completed, fact);
  await analytics.flush(store);
  expect(amplitude).toHaveBeenCalledTimes(2);
  b.release();
  store.set(b.model.completed, fact);
  await analytics.flush(store);
  expect(amplitude).toHaveBeenCalledTimes(2);
});

test('engines share initialization across feature models within a store, never across stores', async () => {
  const send = vi.fn();
  const init = vi.fn(() => ({ send }));
  const analytics = createAnalytics({ engines: { a: init } });
  const $$search = pipe(
    createSearchModel,
    modelAnalytics(async () => (search) => ({
      event: analytics.event({ trigger: search.completed, map: { a: (fact) => fact } }),
    })),
  );
  const first = createStore();
  const second = createStore();
  const a = $$search.acquire(first, { key: ['a'] });
  const b = $$search.acquire(first, { key: ['b'] });
  const c = $$search.acquire(second);
  await tick();
  for (const [store, model] of [
    [first, a.model],
    [first, b.model],
    [second, c.model],
  ] as const)
    store.set(model.completed, { query: 'x', results: 1 });
  await Promise.all([analytics.flush(first), analytics.flush(second)]);
  expect(init).toHaveBeenCalledTimes(2);
  expect(send).toHaveBeenCalledTimes(3);
  a.release();
  b.release();
  c.release();
});

test('slow and failed engines cannot block healthy engines or a business action', async () => {
  const pending = deferred<{ send(): void }>();
  const send = vi.fn();
  const errors = vi.fn();
  const analytics = createAnalytics({
    engines: {
      slow: () => pending.promise,
      failed: async () => {
        throw new Error('load');
      },
      healthy: () => ({ send }),
    },
    onError: errors,
    timeout: 50,
  });
  const $$search = pipe(
    createSearchModel,
    modelAnalytics(async () => (search) => ({
      event: analytics.event({
        trigger: search.completed,
        map: {
          slow: (fact) => fact,
          failed: (fact) => fact,
          healthy: (fact) => fact,
        },
      }),
    })),
  );
  const store = createStore();
  const owner = $$search.acquire(store);
  await tick();
  expect(() => store.set(owner.model.completed, { query: 'desk', results: 1 })).not.toThrow();
  await tick();
  expect(send).toHaveBeenCalledTimes(1);
  expect(errors.mock.calls[0]![0]).toMatchObject({ engine: 'failed', phase: 'load' });
  owner.release();
  await analytics.dispose(store);
  const dispose = vi.fn();
  pending.resolve({ send() {}, dispose } as never);
  await tick();
  expect(dispose).toHaveBeenCalledTimes(1);
});

test('late feature imports do not activate released models; independent loaders do not wait for each other', async () => {
  const loading = deferred<(model: ReturnType<typeof createSearchModel>) => object>();
  const late = vi.fn(() => ({}));
  const ready = vi.fn(() => ({}));
  const $$search = pipe(
    createSearchModel,
    modelAnalytics(() => loading.promise),
    modelAnalytics(async () => ready),
  );
  const store = createStore();
  const owner = $$search.acquire(store);
  await tick();
  expect(ready).toHaveBeenCalledTimes(1);
  owner.release();
  loading.resolve(late);
  await tick();
  expect(late).not.toHaveBeenCalled();
});

test('ordinary atom triggers observe changes; event triggers preserve repeated equal payloads', async () => {
  const send = vi.fn();
  const analytics = createAnalytics({ engines: { a: () => ({ send }) } });
  const $$model = pipe(() => {
    const $state = atom(0);
    const event = eventAtom<number>();
    return {
      $state,
      event,
      stateObserved: analytics.event({
        trigger: $state,
        map: { a: (value) => ({ kind: 'state', value }) },
      }),
      eventObserved: analytics.event({
        trigger: event,
        map: { a: (value) => ({ kind: 'fact', value }) },
      }),
    };
  }, modelRegistry());
  const store = createStore();
  const owner = $$model.acquire(store);
  store.set(owner.model.$state, 1);
  store.set(owner.model.$state, 1);
  store.set(owner.model.event, 1);
  store.set(owner.model.event, 1);
  await analytics.flush(store);
  expect(send.mock.calls.map(([value]) => value)).toEqual([
    { kind: 'state', value: 1 },
    { kind: 'fact', value: 1 },
    { kind: 'fact', value: 1 },
  ]);
  owner.release();
});

test('returned bonds activate automatically while unrelated derived atoms stay lazy', () => {
  const projected = vi.fn((get) => get(atom(1)));
  const $$model = pipe(() => {
    const occurred = eventAtom<number>();
    const $value = atom(0);
    return {
      occurred,
      $value,
      $unused: atom(projected),
      update: bond({ trigger: occurred, map: (value) => [value] }),
    };
  }, modelRegistry());
  const store = createStore();
  const owner = $$model.acquire(store);
  store.set(owner.model.occurred, 3);
  expect(store.get(owner.model.update)).toEqual([3]);
  expect(projected).not.toHaveBeenCalled();
  owner.release();
  store.set(owner.model.occurred, 4);
  expect(store.get(owner.model.update)).toEqual([3]);
});

test('lifecycle loads once, ignores stale restoration after edits, and saves captured dirty state', async () => {
  const pending = deferred<string>();
  const load = vi.fn(() => pending.promise);
  const save = vi.fn();
  const $$profile = pipe(
    () => {
      const $draft = atom('');
      const loaded = actionAtom((_get, set, value: string) => set($draft, value));
      return { $draft, loaded };
    },
    modelLifecycle({
      load,
      restore: (profile) => profile.loaded,
      snapshot: (profile) => profile.$draft,
      save,
    }),
    modelRegistry(),
  );
  const store = createStore();
  const owner = $$profile.acquire(store);
  await tick();
  store.set(owner.model.$draft, 'local edit');
  pending.resolve('server');
  await tick();
  expect(store.get(owner.model.$draft)).toBe('local edit');
  owner.release();
  await tick();
  expect(save.mock.calls[0]![0]).toMatchObject({ snapshot: 'local edit' });
  const again = $$profile.acquire(store);
  await tick();
  expect(load).toHaveBeenCalledTimes(1);
  again.release();
});

test('retained parent reuses its analytics child and reconnects synchronously on return', async () => {
  const send = vi.fn();
  const analytics = createAnalytics({ engines: { a: () => ({ send }) } });
  const factory = vi.fn((search: ReturnType<typeof createSearchModel>) => ({
    event: analytics.event({ trigger: search.completed, map: { a: (fact) => fact } }),
  }));
  const load = vi.fn(async () => factory);
  const $$search = pipe(createSearchModel, modelAnalytics(load));
  const store = createStore();
  const first = $$search.acquire(store);
  await tick();
  first.release();
  const second = $$search.acquire(store);
  store.set(second.model.completed, { query: 'immediate', results: 1 });
  await analytics.flush(store);
  expect(load).toHaveBeenCalledTimes(1);
  expect(factory).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledTimes(1);
  second.release();
});

test('early facts before feature readiness are not replayed with a later state snapshot', async () => {
  const send = vi.fn();
  const analytics = createAnalytics({ engines: { a: () => ({ send }) } });
  const ready = deferred<(model: ReturnType<typeof createSearchModel>) => object>();
  const $$search = pipe(
    createSearchModel,
    modelAnalytics(() => ready.promise),
  );
  const store = createStore();
  const owner = $$search.acquire(store);
  store.set(owner.model.completed, { query: 'early', results: 1 });
  store.set(owner.model.$category, 'later');
  ready.resolve((search) => ({
    event: analytics.event({
      trigger: search.completed,
      state: { category: search.$category },
      map: { a: ({ category }, fact) => ({ category, query: fact.query }) },
    }),
  }));
  await tick();
  store.set(owner.model.completed, { query: 'ready', results: 1 });
  await analytics.flush(store);
  expect(send.mock.calls.map(([value]) => value)).toEqual([{ category: 'later', query: 'ready' }]);
  owner.release();
});

test('bounded queues preserve FIFO, report overflow and detach payloads while an engine loads', async () => {
  const loading = deferred<{ send(value: unknown): void }>();
  const send = vi.fn();
  const onError = vi.fn();
  const analytics = createAnalytics({
    engines: { a: () => loading.promise },
    queueLimit: 2,
    onError,
  });
  const $$model = pipe(() => {
    const happened = eventAtom<{ value: number }>();
    return {
      happened,
      observer: analytics.event({ trigger: happened, map: { a: (value) => value } }),
    };
  }, modelRegistry());
  const store = createStore();
  const owner = $$model.acquire(store);
  const payload = { value: 1 };
  store.set(owner.model.happened, payload);
  payload.value = 99;
  store.set(owner.model.happened, { value: 2 });
  store.set(owner.model.happened, { value: 3 });
  owner.release();
  loading.resolve({ send });
  await analytics.flush(store);
  expect(send.mock.calls.map(([value]) => value)).toEqual([{ value: 1 }, { value: 2 }]);
  expect(onError.mock.calls[0]![0]).toMatchObject({ engine: 'a', phase: 'overflow' });
});

test('mapper failures and rejected handoffs remain independent; dispose prevents later initialization', async () => {
  const errors = vi.fn();
  const send = vi.fn();
  const init = vi.fn(() => ({ send }));
  const analytics = createAnalytics({
    engines: {
      brokenMap: () => ({ send() {} }),
      brokenSend: () => ({
        send: async () => {
          throw new Error('send');
        },
      }),
      healthy: init,
    },
    onError: errors,
  });
  const $$model = pipe(() => {
    const happened = eventAtom<number>();
    return {
      happened,
      observer: analytics.event({
        trigger: happened,
        map: {
          brokenMap: () => {
            throw new Error('map');
          },
          brokenSend: (value) => ({ value }),
          healthy: (value) => ({ value }),
        },
      }),
    };
  }, modelRegistry());
  const store = createStore();
  const owner = $$model.acquire(store);
  store.set(owner.model.happened, 1);
  await analytics.flush(store);
  expect(send).toHaveBeenCalledTimes(1);
  expect(errors.mock.calls.map(([error]) => error.phase)).toEqual(['map', 'send']);
  await analytics.dispose(store);
  store.set(owner.model.happened, 2);
  await tick();
  expect(init).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledTimes(1);
  owner.release();
});

test('engine load deadlines release pending queues and dispose a late adapter', async () => {
  vi.useFakeTimers();
  try {
    const loading = deferred<{ send(): void; dispose(): void }>();
    const onError = vi.fn();
    const dispose = vi.fn();
    const send = vi.fn();
    const analytics = createAnalytics({
      engines: { a: () => loading.promise },
      timeout: 50,
      onError,
    });
    const $$model = pipe(() => {
      const happened = eventAtom<number>();
      return {
        happened,
        observer: analytics.event({ trigger: happened, map: { a: (value) => ({ value }) } }),
      };
    }, modelRegistry());
    const store = createStore();
    const owner = $$model.acquire(store);
    store.set(owner.model.happened, 1);
    await tick();
    await vi.advanceTimersByTimeAsync(51);
    expect(onError.mock.calls[0]![0]).toMatchObject({ phase: 'load' });
    loading.resolve({ send, dispose });
    await tick();
    expect(send).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledTimes(1);
    owner.release();
  } finally {
    vi.useRealTimers();
  }
});

test('explicit lifecycle flush saves while owned, serializes revisions and does not activate a cold model', async () => {
  const calls: string[] = [];
  const gate = deferred<void>();
  const $$draft = pipe(
    () => ({ $value: atom('') }),
    modelLifecycle({
      snapshot: (model) => model.$value,
      save: async ({ snapshot }) => {
        calls.push(snapshot);
        if (snapshot === 'first') await gate.promise;
      },
    }),
  );
  const store = createStore();
  await $$draft.flush(store);
  expect(calls).toEqual([]);
  const owner = $$draft.acquire(store);
  store.set(owner.model.$value, 'first');
  const flushing = owner.flush();
  await tick();
  store.set(owner.model.$value, 'second');
  const again = owner.flush();
  await tick();
  expect(calls).toEqual(['first']);
  gate.resolve();
  await Promise.all([flushing, again]);
  expect(calls).toEqual(['first', 'second']);
  owner.release();
  await tick();
  expect(calls).toEqual(['first', 'second']);
});

function analyticsTypes() {
  const analytics = createAnalytics({
    engines: { a: () => ({ send(_value: { count: number }) {} }) },
  });
  const trigger = eventAtom<string>();
  analytics.event({ trigger, map: { a: (value) => ({ count: value.length }) } });
  // @ts-expect-error Engine message types must be respected.
  analytics.event({ trigger, map: { a: (value) => ({ count: value }) } });
  // @ts-expect-error Unknown engines are not accepted.
  analytics.event({ trigger, map: { missing: () => ({}) } });
  // @ts-expect-error An analytics factory returns a synchronous record.
  modelAnalytics(async () => async (_model: {}) => ({}));
}
void analyticsTypes;

test('decorating an existing registry preserves the business instance and shares inherited activations', async () => {
  const create = vi.fn(createSearchModel);
  const factory = vi.fn((_search: ReturnType<typeof createSearchModel>) => ({}));
  const $$base = pipe(create, modelRegistry());
  const $$observed = pipe(
    $$base,
    modelAnalytics(async () => factory),
  );
  const $$twice = pipe(
    $$observed,
    modelAnalytics(async () => (_model: ReturnType<typeof createSearchModel>) => ({})),
  );
  const store = createStore();
  const base = $$base.acquire(store, { key: ['same'] });
  const first = $$observed.acquire(store, { key: ['same'] });
  const second = $$twice.acquire(store, { key: ['same'] });
  await tick();
  expect(base.model).toBe(first.model);
  expect(first.model).toBe(second.model);
  expect(create).toHaveBeenCalledTimes(1);
  expect(factory).toHaveBeenCalledTimes(1);
  first.release();
  second.release();
  expect($$base.remove(store, { key: ['same'] })).toBe(false);
  base.release();
  expect($$observed.remove(store, { key: ['same'] })).toBe(true);
});

function lifecycleTypes() {
  const createProfile = (initial: { profileId: string }) => {
    const $draft = atom(initial.profileId);
    const loaded = actionAtom((_get, set, value: string) => set($draft, value));
    return { $draft, loaded };
  };
  const $$profile = pipe(
    createProfile,
    modelLifecycle({
      load: ({ initial, signal }) => {
        const id: string = initial.profileId;
        const abort: AbortSignal = signal;
        return Promise.resolve(id);
      },
      restore: (profile) => profile.loaded,
      snapshot: (profile) => profile.$draft,
      save: ({ initial, snapshot }) => {
        const id: string = initial.profileId;
        const value: string = snapshot;
      },
    }),
    modelRegistry({ initial: { profileId: 'default' } }),
  );
  $$profile({ key: ['42'], initial: { profileId: '42' } });
  // @ts-expect-error Initial fields retain their type through modifiers.
  $$profile({ initial: { profileId: 42 } });
}
void lifecycleTypes;

test('returned persistence shares ownership with an explicit low-level connection', async () => {
  const read = vi.fn(async () => 'server');
  const write = vi.fn(async () => {});
  const $$draft = createModel({
    create: () => {
      const $value = atom('');
      const persistence = persist({
        read: $value,
        restore: $value,
        key: 'draft',
        storage: { read, write },
        codec: { decode: (value) => String(value), encode: (value) => value },
      });
      return { $value, persistence };
    },
    resources: (model) => [model.persistence],
  });
  const store = createStore();
  const a = $$draft.acquire(store);
  const b = $$draft.acquire(store);
  await tick();
  expect(store.get(a.model.$value)).toBe('server');
  expect(read).toHaveBeenCalledTimes(1);
  store.set(a.model.$value, 'local');
  a.release();
  b.release();
  await tick();
  expect(write).toHaveBeenCalledTimes(1);
});

test('optional analytics reconnect errors cannot break the business owner', async () => {
  let fail = false;
  const onError = vi.fn();
  const $$search = pipe(
    createSearchModel,
    modelAnalytics(
      async () => () => ({
        observer: {
          [managedConnection]() {
            if (fail) throw new Error('reconnect');
          },
        },
      }),
      { onError },
    ),
  );
  const store = createStore();
  const first = $$search.acquire(store);
  await tick();
  first.release();
  fail = true;
  const again = $$search.acquire(store);
  expect(again.model).toBe(first.model);
  expect(onError.mock.calls[0]![0].message).toBe('reconnect');
  again.release();
});

test('data lifecycle aborts a released load, retries, and ignores the stale result', async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const signals: AbortSignal[] = [];
  const load = vi.fn(({ signal }: { signal: AbortSignal }) => {
    signals.push(signal);
    return signals.length === 1 ? first.promise : second.promise;
  });
  const $$draft = pipe(
    () => ({ $draft: atom('') }),
    modelLifecycle({
      load,
      restore: (model) => model.$draft,
      snapshot: (model) => model.$draft,
    }),
  );
  const store = createStore();
  const owner = $$draft.acquire(store);
  await tick();
  owner.release();
  expect(signals[0]!.aborted).toBe(true);
  const again = $$draft.acquire(store);
  await tick();
  first.resolve('stale');
  second.resolve('current');
  await tick();
  expect(store.get(again.model.$draft)).toBe('current');
  again.release();
});

test('lifecycle save failures report in the background and remain retryable through explicit flush', async () => {
  let failed = true;
  const onError = vi.fn();
  const save = vi.fn(async () => {
    if (failed) throw new Error('save failed');
  });
  const $$draft = pipe(
    () => ({ $draft: atom('') }),
    modelLifecycle({
      snapshot: (model) => model.$draft,
      save,
      onError,
    }),
  );
  const store = createStore();
  const owner = $$draft.acquire(store);
  store.set(owner.model.$draft, 'edit');
  await expect(owner.flush()).rejects.toThrow('save failed');
  owner.release();
  await tick();
  expect(onError).toHaveBeenCalledTimes(1);
  failed = false;
  await $$draft.flush(store);
  expect(save).toHaveBeenCalledTimes(3);
});

function longCompositionTypes() {
  const observe = () =>
    modelAnalytics(async () => (model: ReturnType<typeof createSearchModel>) => ({}));
  const $$search = pipe(
    createSearchModel,
    modelRegistry(),
    observe(),
    observe(),
    observe(),
    observe(),
    observe(),
    observe(),
  );
  const model: ReturnType<typeof createSearchModel> = createStore().get($$search());
  const $$extended = pipe(
    $$search,
    observe(),
    observe(),
    observe(),
    observe(),
    observe(),
    observe(),
    observe(),
  );
  const extended: ReturnType<typeof createSearchModel> = createStore().get($$extended());
  void [model, extended];
}
void longCompositionTypes;

test('cleanup releases base and decorated owners even when both fail, preserving both errors', () => {
  const baseCleanup = vi.fn(() => {
    throw new Error('base cleanup');
  });
  const childCleanup = vi.fn(() => {
    throw new Error('child cleanup');
  });
  const $$base = createModel({
    create: () => ({}),
    resources: () => [{ connect: () => baseCleanup }],
  });
  const $$observed = pipe(
    $$base,
    modelAnalytics(() => () => ({
      observer: { [managedConnection]: () => childCleanup },
    })),
  );
  const lease = $$observed.acquire(createStore());
  try {
    lease.release();
    throw new Error('Expected cleanup failure');
  } catch (error) {
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toHaveLength(2);
  }
  expect(baseCleanup).toHaveBeenCalledTimes(1);
  expect(childCleanup).toHaveBeenCalledTimes(1);
  lease.release();
});

test('different registry keys own different analytics children even when factories return one record', () => {
  const shared = createSearchModel();
  const factory = vi.fn((_model: typeof shared) => ({}));
  const $$model = pipe(
    () => shared,
    modelRegistry(),
    modelAnalytics(() => factory),
  );
  const store = createStore();
  const first = $$model.acquire(store, { key: ['first'] });
  const second = $$model.acquire(store, { key: ['second'] });
  expect(first.model).toBe(second.model);
  expect(factory).toHaveBeenCalledTimes(2);
  first.release();
  expect($$model.remove(store, { key: ['first'] })).toBe(true);
  expect($$model.remove(store, { key: ['second'] })).toBe(false);
  second.release();
});

test('lifecycle initialization uses each registry key and its creation initial, not record equality', async () => {
  const shared = { $value: atom('') };
  const load = vi.fn(({ initial }: { initial: { id: string } }) => initial.id);
  const $$model = pipe(
    (_initial: { id: string }) => shared,
    modelLifecycle({
      load,
      restore: (model) => model.$value,
    }),
    modelRegistry({ initial: { id: 'default' } }),
  );
  const store = createStore();
  const first = $$model.acquire(store, { key: ['first'], initial: { id: 'first' } });
  await tick();
  first.release();
  const second = $$model.acquire(store, { key: ['second'], initial: { id: 'second' } });
  await tick();
  expect(load.mock.calls.map(([context]) => context.initial.id)).toEqual(['first', 'second']);
  second.release();
});

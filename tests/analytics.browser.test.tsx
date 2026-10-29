import { atom, createStore, Provider } from 'jotai';
import { act, StrictMode, Suspense } from 'react';
import { expect, test, vi } from 'vitest';
import { actionAtom, eventAtom, holo } from '../src/index.js';
import { createAnalytics, modelAnalytics } from '../src/analytics.js';
import { modelRegistry, pipe } from '../src/model.js';
import { createHarness, deferred } from './browser-harness.js';

function createSearch() {
  const $term = atom('');
  const completed = eventAtom<{ resultCount: number }>();
  const changed = actionAtom((_get, set, value: string) => set($term, value));
  return { $term, completed, changed };
}

test('lazy analytics activation adds no View render and input reaches the same selected model', async () => {
  const send = vi.fn();
  const render = vi.fn();
  const pending = deferred<(model: ReturnType<typeof createSearch>) => object>();
  const analytics = createAnalytics({ engines: { a: () => ({ send }) } });
  const $$search = pipe(
    createSearch,
    modelRegistry(),
    modelAnalytics(() => pending.promise),
  );
  const Search = holo({
    models: { search: $$search },
    view: ({ term, value }: { term: string; value: string }) => {
      render();
      return (
        <output>
          {term}:{value}
        </output>
      );
    },
    read: ({ search }) => ({ value: search.$term }),
    input: ({ search }) => ({ term: search.changed }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Search term="starfall" />
    </Provider>,
  );
  const before = render.mock.calls.length;
  await act(async () => {
    pending.resolve((search) => ({
      completed: analytics.event({
        trigger: search.completed,
        state: { term: search.$term },
        map: { a: ({ term }, fact) => ({ term, count: fact.resultCount }) },
      }),
    }));
  });
  expect(render).toHaveBeenCalledTimes(before);
  await act(async () => {
    store.set(store.get($$search()).completed, { resultCount: 4 });
    await analytics.flush(store);
  });
  expect(send.mock.calls[0]![0]).toEqual({ term: 'starfall', count: 4 });
  expect(render).toHaveBeenCalledTimes(before);
  await h.render(
    <Provider store={store}>
      <Search term="moon-harbor" />
    </Provider>,
  );
  expect(h.container.textContent).toBe('moon-harbor:moon-harbor');
  await h.unmount();
  store.set(store.get($$search()).completed, { resultCount: 3 });
  await analytics.flush(store);
  expect(send).toHaveBeenCalledTimes(1);
});

test('StrictMode and two Views share one analytics child, with final-owner release', async () => {
  const send = vi.fn();
  const analytics = createAnalytics({ engines: { a: () => ({ send }) } });
  const factory = vi.fn((search: ReturnType<typeof createSearch>) => ({
    completed: analytics.event({ trigger: search.completed, map: { a: (fact) => fact } }),
  }));
  const load = vi.fn(async () => factory);
  const $$search = pipe(createSearch, modelAnalytics(load));
  const Search = holo({ models: { search: $$search }, view: () => null });
  const store = createStore();
  const h = createHarness();
  const tree = (first: boolean) => (
    <StrictMode>
      <Provider store={store}>
        {first && <Search key="first" />}
        <Search key="second" />
      </Provider>
    </StrictMode>
  );
  await h.render(tree(true));
  expect(load).toHaveBeenCalledTimes(1);
  expect(factory).toHaveBeenCalledTimes(1);
  const model = store.get($$search());
  await act(async () => {
    store.set(model.completed, { resultCount: 1 });
    await analytics.flush(store);
  });
  await h.render(tree(false));
  await act(async () => {
    store.set(model.completed, { resultCount: 1 });
    await analytics.flush(store);
  });
  expect(send).toHaveBeenCalledTimes(2);
  await h.unmount();
  store.set(model.completed, { resultCount: 1 });
  await analytics.flush(store);
  expect(send).toHaveBeenCalledTimes(2);
});

test('an abandoned initial Suspense render neither imports analytics nor initializes engines', async () => {
  const engine = vi.fn(() => ({ send() {} }));
  const analytics = createAnalytics({ engines: { a: engine } });
  const load = vi.fn(async () => (search: ReturnType<typeof createSearch>) => ({
    event: analytics.event({ trigger: search.completed, map: { a: (fact) => fact } }),
  }));
  const $$search = pipe(createSearch, modelAnalytics(load));
  const never = new Promise<never>(() => {});
  const Search = holo({
    models: { search: $$search },
    view: () => {
      throw never;
    },
  });
  const h = createHarness();
  await h.render(
    <Suspense fallback="waiting">
      <Search />
    </Suspense>,
  );
  await h.unmount();
  expect(load).not.toHaveBeenCalled();
  expect(engine).not.toHaveBeenCalled();
});

test('changing the selected key during import activates only the still-owned parent', async () => {
  const pending = deferred<(model: ReturnType<typeof createSearch>) => object>();
  const factory = vi.fn(() => ({}));
  const $$search = pipe(
    createSearch,
    modelAnalytics(() => pending.promise),
  );
  const Search = holo({
    models: { search: (props: { id: string }) => $$search({ key: [props.id] }) },
    view: () => null,
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Search id="first" />
    </Provider>,
  );
  const first = store.get($$search({ key: ['first'] }));
  await h.render(
    <Provider store={store}>
      <Search id="second" />
    </Provider>,
  );
  const second = store.get($$search({ key: ['second'] }));
  await act(async () => {
    pending.resolve(factory);
  });
  expect(factory.mock.calls).toEqual([[second]]);
  expect(second).not.toBe(first);
});

test('an eager analytics factory observes the first committed input fact without a business dependency', async () => {
  const send = vi.fn();
  const analytics = createAnalytics({ engines: { a: () => ({ send }) } });
  const $$model = pipe(
    () => ({ inputReceived: eventAtom<string>() }),
    modelAnalytics(() => (model) => ({
      observation: analytics.event({
        trigger: model.inputReceived,
        map: { a: (value) => ({ term: value }) },
      }),
    })),
  );
  const Search = holo({
    models: { search: $$model },
    view: (_props: { term: string }) => null,
    input: ({ search }) => ({ term: search.inputReceived }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <StrictMode>
      <Provider store={store}>
        <Search term="starfall" />
      </Provider>
    </StrictMode>,
  );
  await analytics.flush(store);
  expect(send.mock.calls.map(([value]) => value)).toEqual([{ term: 'starfall' }]);
});

test('switching keys replaces ownership even when the factory returns the same record', async () => {
  const $clock = atom(0);
  const connections: string[] = [];
  $clock.onMount = () => {
    connections.push('connect');
    return () => {
      connections.push('disconnect');
    };
  };
  const shared = { $clock };
  const analytics = createAnalytics({ engines: { a: () => ({ send() {} }) } });
  const factory = vi.fn((model: typeof shared) => ({
    observer: analytics.event({ trigger: model.$clock, map: { a: (value) => ({ value }) } }),
  }));
  const $$model = pipe(
    () => shared,
    modelRegistry(),
    modelAnalytics(() => factory),
  );
  const Connected = holo({
    models: { model: (props: { id: string }) => $$model({ key: [props.id] }) },
    view: () => null,
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Connected id="a" />
    </Provider>,
  );
  await h.render(
    <Provider store={store}>
      <Connected id="b" />
    </Provider>,
  );
  expect(factory).toHaveBeenCalledTimes(2);
  expect(connections).toEqual(['connect', 'disconnect', 'connect']);
  expect($$model.remove(store, { key: ['a'] })).toBe(true);
  expect($$model.remove(store, { key: ['b'] })).toBe(false);
  await h.unmount();
  expect(connections).toEqual(['connect', 'disconnect', 'connect', 'disconnect']);
});

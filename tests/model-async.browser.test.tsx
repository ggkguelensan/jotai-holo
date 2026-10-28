import { modelLifetime } from './model-lifetime.js';
import { act, StrictMode, useEffect } from 'react';
import { atom, createStore, Provider } from 'jotai';
import { createModel } from '../src/model.js';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { actionAtom, holo } from '../src/index.js';
import { createHarness, deferred, ErrorBoundary, suspense } from './browser-harness.js';

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  const calls = consoleError.mock.calls;
  consoleError.mockRestore();
  expect(calls).toEqual([]);
});

function model() {
  const $count = atom(0);
  const increment = actionAtom((_get, set, amount: number = 1) => {
    set($count, (n) => n + amount);
  });
  return { $count, increment };
}

function Button({
  count,
  increment,
  title,
}: {
  count: number;
  increment: (n?: number) => void;
  title: string;
}) {
  return (
    <button onClick={() => increment()}>
      {title}:{count}
    </button>
  );
}

test('changing store updates callbacks and restarts lifecycle without changing model identity', async () => {
  const m = model();
  const counter = createModel({ create: () => m });
  const first = createStore();
  const second = createStore();
  const events: string[] = [];
  const $$owner0 = modelLifetime({
    onMount(get) {
      events.push(`mount:${get(m.$count)}`);
    },
    onUnmount(get) {
      events.push(`unmount:${get(m.$count)}`);
    },
  });
  const C = holo({
    models: { model: counter, _lifetime: $$owner0 },
    view: Button,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ increment: m.increment }),
    props: { title: 'count' },
  });
  second.set(m.$count, 10);
  const h = createHarness();
  await h.render(
    <Provider store={first}>
      <C />
    </Provider>,
  );
  await h.render(
    <Provider store={second}>
      <C />
    </Provider>,
  );
  await act(async () => {
    h.container.querySelector('button')!.click();
  });
  expect(first.get(m.$count)).toBe(0);
  expect(second.get(m.$count)).toBe(11);
  expect(events).toEqual(['mount:0', 'unmount:0', 'mount:10']);
});

test('pending and rejected state follow Suspense/ErrorBoundary; resolved async state does not resuspend on increment', async () => {
  const pending = deferred<string>();
  const m = { ...model(), $name: atom(pending.promise) };
  const counter = createModel({ create: () => m });
  const events: string[] = [];
  const $$owner1 = modelLifetime({
    onMount() {
      events.push('mount');
    },
    onUnmount() {
      events.push('unmount');
    },
  });
  const C = holo({
    models: { model: counter, _lifetime: $$owner1 },
    view: ({ count, name }: { count: number; name: string }) => (
      <b>
        {name}:{count}
      </b>
    ),
    read: ({ model: m }) => ({ count: m.$count, name: m.$name }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  expect(h.container.textContent).toBe('loading');
  await act(async () => {
    pending.resolve('Ada');
  });
  expect(h.container.textContent).toBe('Ada:0');
  const baseline = [...events];
  await act(async () => {
    store.set(m.increment);
  });
  expect(h.container.textContent).toBe('Ada:1');
  expect(events).toEqual(baseline);
  // Same Promise-to-sync transition warning as the isolated native Jotai control.
  expect(consoleError.mock.calls).toHaveLength(1);
  expect(String(consoleError.mock.calls[0]?.[0])).toContain('did not call use() when it finished');
  consoleError.mockClear();
  await h.unmount();
  const rejected = deferred<number>();
  const bad = createModel({ create: () => ({ $value: atom(rejected.promise) }) });
  const Bad = holo({
    models: { model: bad },
    view: ({ value }: { value: number }) => <b>{value}</b>,
    read: ({ model: m }) => ({ value: m.$value }),
  });
  const boundary = createHarness();
  await boundary.render(<ErrorBoundary>{suspense(<Bad />)}</ErrorBoundary>);
  const error = new Error('failed');
  await act(async () => {
    rejected.reject(error);
  });
  expect(boundary.container.textContent).toBe('error');
  expect(boundary.caught).toContain(error);
});

test('StrictMode and repeated mount/unmount leave no active model resources or atom subscriptions', async () => {
  let resources = 0;
  let subscriptions = 0;
  let lifecycle = 0;
  const Counter = createModel({
    create: () => {
      const m = model();
      m.$count.onMount = () => {
        subscriptions++;
        return () => {
          subscriptions--;
        };
      };

      return m;
    },
    resources: () => [
      {
        connect: () => {
          resources++;
          return () => {
            resources--;
          };
        },
      },
    ],
  });
  const counter = Counter;
  const $$owner2 = modelLifetime({
    onMount() {
      lifecycle++;
    },
    onUnmount() {
      lifecycle--;
    },
  });
  const C = holo({
    models: { model: counter, _lifetime: $$owner2 },
    view: Button,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ increment: m.increment }),
    props: { title: 'count' },
  });
  const h = createHarness();
  for (let i = 0; i < 30; i++) {
    await h.render(
      <StrictMode>
        <Provider>
          <C />
        </Provider>
      </StrictMode>,
    );
    expect([resources, subscriptions, lifecycle]).toEqual([1, 1, 1]);
    await h.render(null);
    expect([resources, subscriptions, lifecycle]).toEqual([0, 0, 0]);
  }
});

test('actions-only binding mounts the model but never subscribes to its atom', async () => {
  let resources = 0;
  let subscriptions = 0;
  const runtime = model();
  runtime.$count.onMount = () => {
    subscriptions++;
    return () => {
      subscriptions--;
    };
  };
  const Counter = createModel({
    create: () => {
      return runtime;
    },
    resources: () => [
      {
        connect: () => {
          resources++;
          return () => {
            resources--;
          };
        },
      },
    ],
  });
  const counter = Counter;
  const C = holo({
    models: { model: counter },
    view: ({ increment }: { increment: (n?: number) => void }) => (
      <button onClick={() => increment()}>increment</button>
    ),
    write: ({ model: m }) => ({ increment: m.increment }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  expect([resources, subscriptions]).toEqual([1, 0]);
  await act(async () => {
    h.container.querySelector('button')!.click();
  });
  expect(store.get(runtime.$count)).toBe(1);
  expect(subscriptions).toBe(0);
  await h.unmount();
  expect([resources, subscriptions]).toEqual([0, 0]);
});

test('replacing a never-promise before first commit wakes the suspended binding', async () => {
  const pending = new Promise<number>(() => {});
  const $value = atom<number | Promise<number>>(pending);
  const counter = createModel({ create: () => ({ $value }) });
  const C = holo({
    models: { model: counter },
    view: ({ value }: { value: number }) => <b>{value}</b>,
    read: ({ model: m }) => ({ value: m.$value }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  expect(h.container.textContent).toBe('loading');
  await act(async () => {
    store.set($value, 7);
  });
  expect(h.container.textContent).toBe('7');
  for (const call of consoleError.mock.calls)
    expect(String(call[0])).toContain('did not call use() when it finished');
  expect(consoleError.mock.calls.length).toBeLessThanOrEqual(1);
  consoleError.mockClear();
});

test('a later rejection reaches ErrorBoundary while an earlier binding never resolves', async () => {
  const task = deferred<number>();
  const counter = createModel({
    create: () => ({ $never: atom(new Promise<number>(() => {})), $task: atom(task.promise) }),
  });
  const C = holo({
    models: { model: counter },
    view: (_props: { first: number; second: number }) => <b>ready</b>,
    read: ({ model: m }) => ({ first: m.$never, second: m.$task }),
  });
  const h = createHarness();
  await h.render(<ErrorBoundary>{suspense(<C />)}</ErrorBoundary>);
  const error = new Error('later failed');
  await act(async () => {
    task.reject(error);
  });
  expect(h.container.textContent).toBe('error');
  expect(h.caught).toEqual([error]);
});

test('keyed selectors keep the resolved View identity through initial Suspense retries', async () => {
  const pending = deferred<string>();
  const Model = createModel({
    initial: '',
    create: (id) => ({ $text: atom(pending.promise), $id: atom(id) }),
  });
  let bindings = 0;
  const Connected = holo({
    models: { selected: (input: { id: string }) => Model({ key: [input.id], initial: input.id }) },
    view: ({ text, selectedId }: { text: string; selectedId: string }) => (
      <b>
        {selectedId}:{text}
      </b>
    ),
    read: ({ selected }) => {
      bindings++;
      return { text: selected.$text, selectedId: selected.$id };
    },
  });
  const h = createHarness();
  const store = createStore();
  await h.render(<Provider store={store}>{suspense(<Connected id="a" />)}</Provider>);
  expect(h.container.textContent).toBe('loading');
  await act(async () => pending.resolve('ready'));
  expect(h.container.textContent).toBe('a:ready');
  expect(bindings).toBe(1);
});

test('changing public props rerenders View once without reselecting atoms or restarting lifecycle', async () => {
  const runtime = model();
  const counter = createModel({ create: () => runtime });
  let selections = 0;
  let renders = 0;
  let mounts = 0;
  const changes: string[] = [];
  const callbacks = new Set<unknown>();
  const C = holo({
    models: { model: counter },
    view: ({
      count,
      increment,
      label,
    }: {
      count: number;
      increment: (n?: number) => void;
      label: string;
    }) => {
      renders++;
      callbacks.add(increment);
      useEffect(() => {
        mounts++;
      }, []);
      return (
        <b>
          {label}:{count}
        </b>
      );
    },
    read: ({ model: m }) => ({
      count: (() => {
        selections++;
        return m.$count;
      })(),
    }),
    write: ({ model: m }) => ({ increment: m.increment }),
    input: {
      label: atom(null, (_get, _set, value: string) => {
        changes.push(value);
      }),
    },
  });
  const h = createHarness();
  await h.render(
    <Provider>
      <C label="first" />
    </Provider>,
  );
  const baseline = { renders, selections };
  await h.render(
    <Provider>
      <C label="second" />
    </Provider>,
  );
  expect(renders).toBe(baseline.renders + 1);
  expect(selections).toBe(baseline.selections);
  expect(mounts).toBe(1);
  expect(callbacks.size).toBe(1);
  expect(changes).toEqual(['first', 'second']);
});

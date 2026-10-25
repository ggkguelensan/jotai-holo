import { act, StrictMode, useEffect, useState } from 'react';
import { atom, createStore, Provider } from 'jotai';
import {
  createInjector,
  createScope,
  InjectorProvider,
  molecule,
  moleculeInterface,
  onMount,
  ScopeProvider,
} from 'bunshi/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { actionAtom, holo } from '../src/index.js';
import { holoMolecule } from '../src/bunshi.js';
import { createBinding } from '../src/binding.js';
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

test('adapter bindings share one resolver and unchanged props/atoms do not rerender View', async () => {
  const runtime = model();
  let resolves = 0;
  let selections = 0;
  let renders = 0;
  let mounts = 0;
  let cleanups = 0;
  const callbacks: ((n?: number) => void)[] = [];
  const source = {
    useValue() {
      resolves++;
      return runtime;
    },
  };
  const $direct = atom('title');
  const C = holo({
    core: ({ count, increment, title }: Parameters<typeof Button>[0]) => {
      renders++;
      callbacks.push(increment);
      useEffect(() => {
        mounts++;
        return () => {
          cleanups++;
        };
      }, []);
      return <Button count={count} increment={increment} title={title} />;
    },
    state: {
      count: createBinding(source, (m: typeof runtime) => {
        selections++;
        return m.$count;
      }),
      title: $direct,
    },
    actions: { increment: createBinding(source, (m: typeof runtime) => m.increment) },
  });
  const h = createHarness();
  const store = createStore();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  const baseline = { resolves, selections, renders };
  expect(resolves).toBe(1);
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  expect({ resolves, selections, renders }).toEqual(baseline);
  await act(async () => {
    store.set(runtime.increment);
  });
  expect(renders).toBe(baseline.renders + 1);
  expect(resolves).toBe(baseline.resolves);
  expect(selections).toBe(baseline.selections);
  expect(callbacks.every((cb) => cb === callbacks[0])).toBe(true);
  await act(async () => {
    store.set(runtime.$count, 1);
  });
  expect(renders).toBe(baseline.renders + 1);
  expect(mounts).toBe(1);
  await h.unmount();
  expect(cleanups).toBe(1);
});

test('same-scope consumers share values, different scopes are independent and last consumer disposes resources', async () => {
  const scope = createScope('default');
  const active = new Set<string>();
  const Counter = molecule((_mol, getScope) => {
    const id = getScope(scope);
    onMount(() => {
      active.add(id);
      return () => {
        active.delete(id);
      };
    });
    return model();
  });
  const counter = holoMolecule(Counter);
  const C = holo({
    core: Button,
    state: { count: counter((m) => m.$count) },
    actions: { increment: counter((m) => m.increment) },
    bindProps: { title: 'counter' },
  });
  const injector = createInjector();
  const value = () => injector;
  const h = createHarness();
  await h.render(
    <InjectorProvider value={value}>
      <Provider>
        <ScopeProvider scope={scope} value="a">
          <C />
          <C />
        </ScopeProvider>
        <ScopeProvider scope={scope} value="b">
          <C />
        </ScopeProvider>
      </Provider>
    </InjectorProvider>,
  );
  await act(async () => {
    h.container.querySelector('button')!.click();
  });
  expect([...h.container.querySelectorAll('button')].map((b) => b.textContent)).toEqual([
    'counter:1',
    'counter:1',
    'counter:0',
  ]);
  expect([...active].sort()).toEqual(['a', 'b']);
  await h.unmount();
  expect(active.size).toBe(0);
});

test('scope replacement releases previous atom subscription and callbacks target the new model', async () => {
  const scope = createScope('default');
  const models = new Map<string, ReturnType<typeof model>>();
  const mounted = new Set<string>();
  const active = new Set<string>();
  let renders = 0;
  let viewMounts = 0;
  const Counter = molecule((_mol, getScope) => {
    const id = getScope(scope);
    const m = model();
    models.set(id, m);
    m.$count.onMount = () => {
      mounted.add(id);
      return () => {
        mounted.delete(id);
      };
    };
    onMount(() => {
      active.add(id);
      return () => {
        active.delete(id);
      };
    });
    return m;
  });
  const counter = holoMolecule(Counter);
  const C = holo({
    core: (props: Parameters<typeof Button>[0]) => {
      renders++;
      const [local] = useState('retained');
      useEffect(() => {
        viewMounts++;
      }, []);
      expect(local).toBe('retained');
      return <Button {...props} />;
    },
    state: { count: counter((m) => m.$count) },
    actions: { increment: counter((m) => m.increment) },
    bindProps: { title: 'count' },
  });
  const injector = createInjector();
  const value = () => injector;
  const store = createStore();
  const tree = (id: string) => (
    <InjectorProvider value={value}>
      <Provider store={store}>
        <ScopeProvider scope={scope} value={id}>
          <C />
        </ScopeProvider>
      </Provider>
    </InjectorProvider>
  );
  const h = createHarness();
  await h.render(tree('a'));
  await h.render(tree('b'));
  expect(viewMounts).toBe(1);
  expect([...mounted]).toEqual(['b']);
  expect([...active]).toEqual(['b']);
  const baseline = renders;
  await act(async () => {
    store.set(models.get('a')!.increment);
  });
  expect(renders).toBe(baseline);
  await act(async () => {
    h.container.querySelector('button')!.click();
  });
  expect(store.get(models.get('b')!.$count)).toBe(1);
  expect(h.container.textContent).toBe('count:1');
  await h.unmount();
  expect(mounted.size).toBe(0);
  expect(active.size).toBe(0);
});

test('interfaces follow injector replacement and separate stores isolate the same model', async () => {
  const Model = moleculeInterface<ReturnType<typeof model>>();
  const firstModel = model();
  const secondModel = model();
  const first = createInjector({ bindings: [[Model, molecule(() => firstModel)]] });
  const second = createInjector({ bindings: [[Model, molecule(() => secondModel)]] });
  const counter = holoMolecule(Model);
  const C = holo({
    core: Button,
    state: { count: counter((m) => m.$count) },
    actions: { increment: counter((m) => m.increment) },
    bindProps: { title: 'count' },
  });
  const firstStore = createStore();
  const secondStore = createStore();
  const value1 = () => first;
  const value2 = () => second;
  const tree = (value: typeof value1) => (
    <InjectorProvider value={value}>
      <Provider store={firstStore}>
        <C />
      </Provider>
      <Provider store={secondStore}>
        <C />
      </Provider>
    </InjectorProvider>
  );
  const h = createHarness();
  await h.render(tree(value1));
  await act(async () => {
    h.container.querySelector('button')!.click();
  });
  expect(firstStore.get(firstModel.$count)).toBe(1);
  expect(secondStore.get(firstModel.$count)).toBe(0);
  await h.render(tree(value2));
  await act(async () => {
    h.container.querySelector('button')!.click();
  });
  expect(firstStore.get(firstModel.$count)).toBe(1);
  expect(firstStore.get(secondModel.$count)).toBe(1);
});

test('changing store updates callbacks and restarts cage without changing model identity', async () => {
  const m = model();
  const counter = holoMolecule(molecule(() => m));
  const first = createStore();
  const second = createStore();
  const events: string[] = [];
  const C = holo({
    core: Button,
    state: { count: counter((m) => m.$count) },
    actions: { increment: counter((m) => m.increment) },
    bindProps: { title: 'count' },
    cage: {
      onMount(get) {
        events.push(`mount:${get(m.$count)}`);
      },
      onUnmount(get) {
        events.push(`unmount:${get(m.$count)}`);
      },
    },
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
  const counter = holoMolecule(molecule(() => m));
  const events: string[] = [];
  const C = holo({
    core: ({ count, name }: { count: number; name: string }) => (
      <b>
        {name}:{count}
      </b>
    ),
    state: { count: counter((m) => m.$count), name: counter((m) => m.$name) },
    cage: {
      onMount() {
        events.push('mount');
      },
      onUnmount() {
        events.push('unmount');
      },
    },
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
  const bad = holoMolecule(molecule(() => ({ $value: atom(rejected.promise) })));
  const Bad = holo({
    core: ({ value }: { value: number }) => <b>{value}</b>,
    state: { value: bad((m) => m.$value) },
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
  let cage = 0;
  const Counter = molecule(() => {
    const m = model();
    m.$count.onMount = () => {
      subscriptions++;
      return () => {
        subscriptions--;
      };
    };
    onMount(() => {
      resources++;
      return () => {
        resources--;
      };
    });
    return m;
  });
  const counter = holoMolecule(Counter);
  const C = holo({
    core: Button,
    state: { count: counter((m) => m.$count) },
    actions: { increment: counter((m) => m.increment) },
    bindProps: { title: 'count' },
    cage: {
      onMount() {
        cage++;
      },
      onUnmount() {
        cage--;
      },
    },
  });
  const h = createHarness();
  const injector = createInjector();
  const value = () => injector;
  for (let i = 0; i < 30; i++) {
    await h.render(
      <StrictMode>
        <InjectorProvider value={value}>
          <Provider>
            <C />
          </Provider>
        </InjectorProvider>
      </StrictMode>,
    );
    expect([resources, subscriptions, cage]).toEqual([1, 1, 1]);
    await h.render(null);
    expect([resources, subscriptions, cage]).toEqual([0, 0, 0]);
  }
});

test('changing public props rerenders View once without reselecting atoms or restarting cage', async () => {
  const runtime = model();
  const counter = holoMolecule(molecule(() => runtime));
  let selections = 0;
  let renders = 0;
  let mounts = 0;
  let cageMounts = 0;
  const changes: string[] = [];
  const callbacks = new Set<unknown>();
  const C = holo({
    core: ({
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
    state: {
      count: counter((m) => {
        selections++;
        return m.$count;
      }),
    },
    actions: { increment: counter((m) => m.increment) },
    cage: {
      onMount() {
        cageMounts++;
      },
      onChange(_get, _set, ctx) {
        changes.push(ctx.props.label);
      },
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
  expect(cageMounts).toBe(1);
  expect(callbacks.size).toBe(1);
  expect(changes).toEqual(['first', 'second']);
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
  const Counter = molecule(() => {
    onMount(() => {
      resources++;
      return () => {
        resources--;
      };
    });
    return runtime;
  });
  const counter = holoMolecule(Counter);
  const C = holo({
    core: ({ increment }: { increment: (n?: number) => void }) => (
      <button onClick={() => increment()}>increment</button>
    ),
    actions: { increment: counter((m) => m.increment) },
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
  const counter = holoMolecule(molecule(() => ({ $value })));
  const C = holo({
    core: ({ value }: { value: number }) => <b>{value}</b>,
    state: { value: counter((m) => m.$value) },
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
  const counter = holoMolecule(
    molecule(() => ({ $never: atom(new Promise<number>(() => {})), $task: atom(task.promise) })),
  );
  const C = holo({
    core: (_props: { first: number; second: number }) => <b>ready</b>,
    state: { first: counter((m) => m.$never), second: counter((m) => m.$task) },
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

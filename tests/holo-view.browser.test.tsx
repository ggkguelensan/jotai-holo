import { atom, createStore, Provider } from 'jotai';
import { act, StrictMode, Suspense, startTransition, useState } from 'react';
import { expect, test, vi } from 'vitest';
import {
  actionAtom,
  eventAtom,
  holo,
  useImperativeHolo,
  type HoloImperative,
} from '../src/index.js';
import { createModel } from '../src/model.js';
import { createHarness, deferred, suspense } from './browser-harness.js';

type Handle = { onCreated(payload: { id: string }): void };

test('native read/write bindings and two named keyed models isolate state without extra View renders', async () => {
  const create = () => {
    const $count = atom(0);
    return { $count, increment: actionAtom((_get, set) => set($count, (n) => n + 1)) };
  };
  const $$counter = createModel({ create });
  const $online = atom(true);
  const render = vi.fn();
  function View({
    count,
    shared,
    onIncrement,
    title,
    online,
  }: {
    count: number;
    shared: number;
    online: boolean;
    onIncrement: () => void;
    title: string;
  }) {
    render();
    return (
      <button onClick={onIncrement}>
        {title}:{count}:{shared}:{String(online)}
      </button>
    );
  }
  const Counter = holo({
    view: View,
    models: {
      counter: (input: { id: string }) => $$counter({ key: [input.id] }),
      shared: $$counter,
    },
    read: ({ counter, shared }) => ({
      count: counter.$count,
      shared: shared.$count,
      online: $online,
    }),
    write: ({ counter }) => ({ onIncrement: counter.increment }),
    props: { title: 'Counter' },
  });
  const store = createStore();
  const h = createHarness();
  const tree = (id: string, current = store) => (
    <Provider store={current}>
      <Counter id={id} />
    </Provider>
  );
  await h.render(tree('a'));
  expect(h.container.textContent).toBe('Counter:0:0:true');
  const first = render.mock.calls.length;
  await h.render(tree('a'));
  expect(render).toHaveBeenCalledTimes(first);
  await act(async () => h.container.querySelector('button')!.click());
  expect(h.container.textContent).toBe('Counter:1:0:true');
  expect(render).toHaveBeenCalledTimes(first + 1);
  await h.render(tree('b'));
  expect(h.container.textContent).toBe('Counter:0:0:true');
  await h.render(tree('a'));
  expect(h.container.textContent).toBe('Counter:1:0:true');
  await h.render(tree('a', createStore()));
  expect(h.container.textContent).toBe('Counter:0:0:true');
});

test('imperative delivery uses current committed handlers, isolates stores, repeats payloads and stops on unmount', async () => {
  const created = eventAtom<{ id: string }>();
  const handler = vi.fn();
  const renders = vi.fn();
  function View({ imperative, prefix }: { imperative: HoloImperative<Handle>; prefix: string }) {
    renders();
    useImperativeHolo(imperative, {
      onCreated({ id }) {
        handler(`${prefix}:${id}`);
      },
    });
    return <span>{prefix}</span>;
  }
  const Connected = holo({ view: View, imperative: { onCreated: created } });
  const a = createStore();
  const b = createStore();
  const h = createHarness();
  const tree = (prefix: string) => (
    <Provider store={a}>
      <Connected prefix={prefix} />
    </Provider>
  );
  await h.render(tree('first'));
  await act(async () => {
    a.set(created, { id: '42' });
    a.set(created, { id: '42' });
  });
  expect(handler.mock.calls).toEqual([['first:42'], ['first:42']]);
  expect(renders).toHaveBeenCalledTimes(1);
  await h.render(tree('second'));
  await act(async () => {
    a.set(created, { id: '43' });
    b.set(created, { id: 'other' });
  });
  expect(handler).toHaveBeenLastCalledWith('second:43');
  await h.unmount();
  a.set(created, { id: 'late' });
  expect(handler).toHaveBeenCalledTimes(3);
});

test('events emitted during resource connection and lifecycle mount reach the ready View once in StrictMode', async () => {
  const created = eventAtom<{ id: string }>();
  const received = vi.fn();
  const active: string[] = [];
  const $$model = createModel({ create: () => ({ created }) });
  const resource = {
    connect(store: ReturnType<typeof createStore>) {
      active.push('connect');
      store.set(created, { id: 'resource' });
      return () => {
        active.push('disconnect');
      };
    },
  };
  function View({ imperative }: { imperative: HoloImperative<Handle> }) {
    useImperativeHolo(imperative, { onCreated: received });
    return null;
  }
  const Connected = holo({
    view: View,
    models: { checkout: $$model },
    imperative: ({ checkout }) => ({ onCreated: checkout.created }),
    resources: [resource],
    lifecycle: {
      onMount(_get, set) {
        set(created, { id: 'mount' });
      },
      onUnmount() {
        active.push('unmount');
      },
    },
  });
  const h = createHarness();
  await h.render(
    <StrictMode>
      <Connected />
    </StrictMode>,
  );
  expect(received.mock.calls).toEqual([[{ id: 'resource' }], [{ id: 'mount' }]]);
  expect(active).toEqual(['connect']);
  await h.unmount();
  expect(active).toEqual(['connect', 'unmount', 'disconnect']);
});

test('selected input changes dispatch through a writable atom, with latest full input and resolved models', async () => {
  const changed = vi.fn();
  const mounted = vi.fn();
  const unmounted = vi.fn();
  const onInputChange = actionAtom(
    (
      _get,
      _set,
      ctx: { input: { term: string; extra: string }; models: { search: { id: string } } },
    ) => {
      changed(ctx.input.term, ctx.input.extra, ctx.models.search.id);
    },
  );
  const $$search = createModel({ create: () => ({ id: 'model' }) });
  const View = (_props: { term: string; extra: string }) => null;
  const Connected = holo({
    view: View,
    models: { search: $$search },
    lifecycle: {
      input: (input) => ({ term: input.term }),
      onMount: () => {
        mounted();
      },
      onInputChange,
      onUnmount(_get, _set, ctx) {
        unmounted(ctx.input.term);
      },
    },
  });
  const h = createHarness();
  await h.render(<Connected term="a" extra="1" />);
  await h.render(<Connected term="a" extra="2" />);
  await h.render(<Connected term="b" extra="3" />);
  expect(changed.mock.calls).toEqual([
    ['a', '1', 'model'],
    ['b', '3', 'model'],
  ]);
  expect(mounted).toHaveBeenCalledTimes(1);
  await h.unmount();
  expect(unmounted).toHaveBeenCalledWith('b');
});

test('an abandoned suspended render publishes no handlers and acquires no resources', async () => {
  const created = eventAtom<{ id: string }>();
  const handler = vi.fn();
  const connect = vi.fn();
  const pending = new Promise<never>(() => {});
  function View({ imperative, version }: { imperative: HoloImperative<Handle>; version: string }) {
    useImperativeHolo(imperative, {
      onCreated() {
        handler(version);
      },
    });
    if (version === 'pending') throw pending;
    return <span>{version}</span>;
  }
  const Connected = holo({
    view: View,
    imperative: { onCreated: created },
    resources: [{ connect }],
  });
  const h = createHarness();
  const store = createStore();
  await h.render(<Provider store={store}>{suspense(<Connected version="ready" />)}</Provider>);
  expect(connect).toHaveBeenCalledTimes(1);
  await h.transition(
    <Provider store={store}>{suspense(<Connected version="pending" />)}</Provider>,
  );
  store.set(created, { id: '1' });
  expect(handler).toHaveBeenLastCalledWith('ready');
  await h.unmount();
  const cold = createHarness();
  await cold.render(<Provider store={store}>{suspense(<Connected version="pending" />)}</Provider>);
  expect(connect).toHaveBeenCalledTimes(1);
});

test('temporary Suspense hides imperative delivery without releasing model resources or replaying lifecycle', async () => {
  const request = deferred<string>();
  const mounted = vi.fn();
  const unmounted = vi.fn();
  let active = 0;
  const $$model = createModel({
    retainTime: 0,
    create: () => ({ $text: atom<string | Promise<string>>('ready') }),
    resources: () => [
      {
        connect() {
          active++;
          return () => {
            active--;
          };
        },
      },
    ],
  });
  const Connected = holo({
    view: ({ text }: { text: string }) => <span>{text}</span>,
    models: { current: $$model },
    read: ({ current }) => ({ text: current.$text }),
    lifecycle: {
      onMount() {
        mounted();
      },
      onUnmount() {
        unmounted();
      },
    },
  });
  const h = createHarness();
  const store = createStore();
  await h.render(<Provider store={store}>{suspense(<Connected />)}</Provider>);
  await act(async () => store.set(store.get($$model()).$text, request.promise));
  expect(active).toBe(1);
  expect(unmounted).not.toHaveBeenCalled();
  await act(async () => {
    request.resolve('done');
    await request.promise;
  });
  expect(h.container.textContent).toBe('done');
  expect(mounted).toHaveBeenCalledTimes(1);
  await h.unmount();
  expect(active).toBe(0);
  expect(unmounted).toHaveBeenCalledTimes(1);
});

test('imperative sync throws and async failures are isolated from publishers', async () => {
  const created = eventAtom<{ id: string }>();
  const onError = vi.fn();
  const sync = new Error('sync');
  const async = new Error('async');
  function View({ imperative }: { imperative: HoloImperative<Handle> }) {
    useImperativeHolo(imperative, {
      onCreated({ id }) {
        if (id === 'sync') throw sync;
        return Promise.reject(async);
      },
    });
    return null;
  }
  const Connected = holo({ view: View, imperative: { onCreated: created }, onError });
  const h = createHarness();
  const store = createStore();
  await h.render(
    <Provider store={store}>
      <Connected />
    </Provider>,
  );
  await act(async () => {
    expect(() => store.set(created, { id: 'sync' })).not.toThrow();
    store.set(created, { id: 'async' });
  });
  expect(onError.mock.calls).toEqual([[sync], [async]]);
});

test('the method table stays stable across commits and becomes inert after unmount', async () => {
  const event = eventAtom<{ id: string }>();
  const received = vi.fn();
  let currentRef: { current: Handle | null } | undefined;
  function View({ imperative, label }: { imperative: HoloImperative<Handle>; label: string }) {
    currentRef = imperative as { current: Handle | null };
    useImperativeHolo(imperative, {
      onCreated({ id }) {
        received(label, id);
      },
    });
    return null;
  }
  const Connected = holo({ view: View, imperative: { onCreated: event } });
  const h = createHarness();
  await h.render(<Connected label="first" />);
  const handle = currentRef!.current!;
  await h.render(<Connected label="second" />);
  expect(currentRef!.current).toBe(handle);
  handle.onCreated({ id: 'a' });
  expect(received).toHaveBeenLastCalledWith('second', 'a');
  await h.unmount();
  expect(currentRef!.current).toBeNull();
  handle.onCreated({ id: 'late' });
  expect(received).toHaveBeenCalledTimes(1);
});

test('key replacement delivers old unmount input before disconnect and new input to the new model', async () => {
  const events: string[] = [];
  const $$model = createModel({
    create: () => ({ id: Math.random() }),
    resources: (model) => [
      {
        connect() {
          events.push(`connect:${model.id}`);
          return () => {
            events.push(`disconnect:${model.id}`);
          };
        },
      },
    ],
  });
  const View = (_props: { term: string }) => null;
  const Connected = holo({
    view: View,
    models: { selected: (input: { id: string }) => $$model({ key: [input.id] }) },
    lifecycle: {
      onMount(_get, _set, ctx) {
        events.push(`mount:${ctx.models.selected.id}:${ctx.input.term}`);
      },
      onUnmount(_get, _set, ctx) {
        events.push(`unmount:${ctx.models.selected.id}:${ctx.input.term}`);
      },
    },
  });
  const h = createHarness();
  const store = createStore();
  await h.render(
    <Provider store={store}>
      <Connected id="a" term="old" />
    </Provider>,
  );
  const old = store.get($$model({ key: ['a'] })).id;
  await h.render(
    <Provider store={store}>
      <Connected id="b" term="new" />
    </Provider>,
  );
  const next = store.get($$model({ key: ['b'] })).id;
  expect(events.indexOf(`unmount:${old}:old`)).toBeLessThan(events.indexOf(`disconnect:${old}`));
  expect(events).toContain(`mount:${next}:new`);
  await h.unmount();
  expect(events).toContain(`unmount:${next}:new`);
});

test('different keys own different leases even when a factory returns the same model object', async () => {
  const events: string[] = [];
  const shared = { $value: atom(0) };
  const Model = createModel({
    create: () => shared,
    resources: () => [
      {
        connect() {
          events.push('connect');
          return () => {
            events.push('disconnect');
          };
        },
      },
    ],
  });
  const Connected = holo({
    models: { selected: (input: { id: string }) => Model({ key: [input.id] }) },
    view: () => null,
    lifecycle: {
      onMount(_get, _set, ctx) {
        events.push(`mount:${ctx.input.id}`);
      },
      onUnmount(_get, _set, ctx) {
        events.push(`unmount:${ctx.input.id}`);
      },
    },
  });
  const h = createHarness();
  const store = createStore();
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
  expect(events).toEqual(['connect', 'mount:a', 'unmount:a', 'disconnect', 'connect', 'mount:b']);
  expect(Model.remove(store, { key: ['a'] })).toBe(true);
  expect(Model.remove(store, { key: ['b'] })).toBe(false);
  await h.unmount();
  expect(events.slice(-2)).toEqual(['unmount:b', 'disconnect']);
});

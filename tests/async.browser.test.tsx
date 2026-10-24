import { atom, createStore, Provider } from 'jotai';
import { expect, test } from 'vitest';
import { act } from 'react';
import { flushSync } from 'react-dom';
import { holo } from '../src/holo.js';
import { actionAtom } from '../src/action-atom.js';
import { createHarness, deferred, ErrorBoundary, suspense } from './browser-harness.js';

test('pending bindings start together, wait for all values and open cage only after commit', async () => {
  const first = deferred<string>();
  const second = deferred<number>();
  const starts: string[] = [];
  const events: string[] = [];
  const $first = atom(() => {
    starts.push('first');
    return first.promise;
  });
  const $second = atom(() => {
    starts.push('second');
    return second.promise;
  });
  const C = holo({
    core: ({ first, second }: { first: string; second: number }) => (
      <span>
        {first}:{second}
      </span>
    ),
    state: { first: $first, second: $second },
    cage: {
      onMount() {
        events.push('mount');
      },
    },
  });
  const h = createHarness();
  await h.render(suspense(<C />));
  expect(starts).toEqual(['first', 'second']);
  expect(events).toEqual([]);
  await act(async () => first.resolve('ready'));
  expect(h.container.textContent).toBe('loading');
  await act(async () => second.resolve(2));
  expect(h.container.textContent).toBe('ready:2');
  expect(events).toEqual(['mount']);
});

test('settled async state plus a sync update neither suspends nor reopens cage', async () => {
  const $count = atom(0);
  const $name = atom(Promise.resolve('ready'));
  const store = createStore();
  const events: string[] = [];
  let renders = 0;
  const C = holo({
    core: ({ count, name }: { count: number; name: string }) => {
      renders++;
      return (
        <span>
          {name}:{count}
        </span>
      );
    },
    state: { count: $count, name: $name },
    cage: {
      onMount() {
        events.push('mount');
      },
      onUnmount() {
        events.push('unmount');
      },
    },
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  const initial = renders;
  await act(async () => {
    flushSync(() => store.set($count, 1));
    expect(h.container.querySelector('[data-loading]')).toBeNull();
  });
  expect(h.container.textContent).toBe('ready:1');
  expect(events).toEqual(['mount']);
  expect(renders).toBe(initial + 1);
});

test('real pending replacement hides the core but keeps the model lifecycle open', async () => {
  const next = deferred<string>();
  const $value = atom(Promise.resolve('first'));
  const store = createStore();
  const events: string[] = [];
  const C = holo({
    core: ({ value }: { value: string }) => <span>{value}</span>,
    state: { value: $value },
    cage: {
      onMount() {
        events.push('mount');
      },
      onUnmount() {
        events.push('unmount');
      },
    },
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  await act(async () => {
    flushSync(() => store.set($value, next.promise));
  });
  expect(h.container.querySelector('[data-loading]')).not.toBeNull();
  expect(events).toEqual(['mount']);
  await act(async () => next.resolve('next'));
  expect(h.container.textContent).toBe('next');
  expect(events).toEqual(['mount']);
  await h.unmount();
  expect(events).toEqual(['mount', 'unmount']);
});

test('rejection reaches ErrorBoundary even if a second binding never settles', async () => {
  const next = deferred<string>();
  const error = new Error('read failed');
  const C = holo({
    core: ({ value }: { value: string; other: number }) => <span>{value}</span>,
    state: { value: atom(next.promise), other: atom(new Promise<number>(() => undefined)) },
  });
  const h = createHarness();
  await h.render(<ErrorBoundary>{suspense(<C />)}</ErrorBoundary>);
  await act(async () => next.reject(error));
  expect(h.container.textContent).toBe('error');
  expect(h.caught).toEqual([error]);
});

test.each(['resolve', 'reject'] as const)(
  'a stale %s cannot overwrite the newer result',
  async (phase) => {
    const first = deferred<string>();
    const second = deferred<string>();
    const $value = atom(first.promise);
    const store = createStore();
    const C = holo({
      core: ({ value }: { value: string }) => <span>{value}</span>,
      state: { value: $value },
    });
    const h = createHarness();
    await h.render(
      <ErrorBoundary>
        <Provider store={store}>{suspense(<C />)}</Provider>
      </ErrorBoundary>,
    );
    await act(async () => store.set($value, second.promise));
    await act(async () => second.resolve('new'));
    await act(async () =>
      phase === 'resolve' ? first.resolve('old') : first.reject(new Error('old')),
    );
    expect(h.container.textContent).toBe('new');
    expect(h.caught).toEqual([]);
  },
);

test('sync/async/sync transitions preserve the latest committed value', async () => {
  const pending = deferred<number>();
  const $value = atom<number | Promise<number>>(0);
  const store = createStore();
  const C = holo({
    core: ({ value }: { value: number }) => <span>{value}</span>,
    state: { value: $value },
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  await act(async () => {
    flushSync(() => store.set($value, pending.promise));
  });
  expect(h.container.querySelector('[data-loading]')).not.toBeNull();
  await act(async () => store.set($value, 7));
  expect(h.container.textContent).toBe('7');
  await act(async () => pending.resolve(99));
  expect(h.container.textContent).toBe('7');
});

test('derived async reads retain native Jotai AbortSignal and dependency switching', async () => {
  const $query = atom('first');
  const first = deferred<string>();
  const second = deferred<string>();
  const signals = new Map<string, AbortSignal>();
  const store = createStore();
  const $value = atom((get, { signal }) => {
    const key = get($query);
    signals.set(key, signal);
    return key === 'first' ? first.promise : second.promise;
  });
  const C = holo({
    core: ({ value }: { value: string }) => <span>{value}</span>,
    state: { value: $value },
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  await act(async () => store.set($query, 'second'));
  expect(signals.get('first')?.aborted).toBe(true);
  await act(async () => second.resolve('new'));
  await act(async () => first.resolve('old'));
  expect(h.container.textContent).toBe('new');
});

test('pending state stays isolated when the nearest Provider store changes', async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const $value = atom(first.promise);
  const a = createStore();
  const b = createStore();
  b.set($value, second.promise);
  const C = holo({
    core: ({ value }: { value: string }) => <span>{value}</span>,
    state: { value: $value },
  });
  const h = createHarness();
  await h.render(<Provider store={a}>{suspense(<C />)}</Provider>);
  await h.render(<Provider store={b}>{suspense(<C />)}</Provider>);
  await act(async () => first.resolve('old'));
  expect(h.container.textContent).toBe('loading');
  await act(async () => second.resolve('new'));
  expect(h.container.textContent).toBe('new');
});

test('pending actions preserve promise identity and their originating store after unmount', async () => {
  const $count = atom(0);
  const pending = deferred<number>();
  const a = createStore();
  const b = createStore();
  let callback: (() => Promise<number>) | undefined;
  const save = actionAtom(async (_get, set) => {
    const value = await pending.promise;
    set($count, value);
    return value;
  });
  const C = holo({
    core: ({ onSave }: { onSave: () => Promise<number> }) => {
      callback = onSave;
      return null;
    },
    actions: { onSave: save },
  });
  const h = createHarness();
  await h.render(
    <Provider store={a}>
      <C />
    </Provider>,
  );
  if (!callback) throw new Error('Core missing');
  const result = callback();
  await h.render(
    <Provider store={b}>
      <C />
    </Provider>,
  );
  await h.unmount();
  await act(async () => pending.resolve(9));
  await expect(result).resolves.toBe(9);
  expect(a.get($count)).toBe(9);
  expect(b.get($count)).toBe(0);
});

test('async action rejection reaches its caller without becoming a render error', async () => {
  const error = new Error('save failed');
  let callback: (() => Promise<never>) | undefined;
  const fail = actionAtom(async () => {
    throw error;
  });
  const C = holo({
    core: ({ onSave }: { onSave: () => Promise<never> }) => {
      callback = onSave;
      return <span>ready</span>;
    },
    actions: { onSave: fail },
  });
  const h = createHarness();
  await h.render(
    <ErrorBoundary>
      <C />
    </ErrorBoundary>,
  );
  if (!callback) throw new Error('Core missing');
  await expect(callback()).rejects.toBe(error);
  expect(h.container.textContent).toBe('ready');
  expect(h.caught).toEqual([]);
});

test('abandoned transitional props never enter cage snapshots', async () => {
  const pending = new Promise<void>(() => undefined);
  const events: string[] = [];
  const C = holo({
    core: ({ value }: { value: string }) => {
      if (value === 'abandoned') throw pending;
      return <span>{value}</span>;
    },
    cage: {
      onChange(_get, _set, ctx) {
        events.push(ctx.props.value);
      },
      onUnmount(_get, _set, ctx) {
        events.push(`close:${ctx.props.value}`);
      },
    },
  });
  const h = createHarness();
  await h.render(suspense(<C value="committed" />));
  await h.transition(suspense(<C value="abandoned" />));
  await h.unmount();
  expect(events).toEqual(['committed', 'close:committed']);
});

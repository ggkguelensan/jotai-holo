import { atom, createStore, Provider, useAtomValue } from 'jotai';
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { holo } from '../src/holo.js';
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

test.each([0, 1, 2])(
  'rejection in binding %i reaches the boundary while all other bindings remain pending',
  async (index) => {
    const tasks = [deferred<number>(), deferred<number>(), deferred<number>()];
    const [a, b, c] = tasks;
    if (!a || !b || !c) throw new Error('missing task');
    const C = holo({
      view: (_props: { a: number; b: number; c: number }) => <span>ready</span>,
      read: { a: atom(a.promise), b: atom(b.promise), c: atom(c.promise) },
    });
    const error = new Error('failed');
    const h = createHarness();
    await h.render(<ErrorBoundary>{suspense(<C />)}</ErrorBoundary>);
    await act(async () => {
      tasks[index]?.reject(error);
    });
    expect(h.container.textContent).toBe('error');
    expect(h.caught).toEqual([error]);
  },
);

test.each([null, undefined, false, 0, 'failure'])(
  'preserves a synchronous thrown value: %s',
  async (reason) => {
    const C = holo({
      view: (_props: { value: number }) => null,
      read: {
        value: atom<number>(() => {
          throw reason;
        }),
      },
    });
    const h = createHarness();
    await h.render(<ErrorBoundary>{suspense(<C />)}</ErrorBoundary>);
    expect(h.caught).toEqual([reason]);
  },
);

test.each([null, undefined, false, 0, 'failure'])(
  'preserves an async rejection reason: %s',
  async (reason) => {
    const task = deferred<number>();
    const C = holo({
      view: (_props: { value: number }) => null,
      read: { value: atom(task.promise) },
    });
    const h = createHarness();
    await h.render(<ErrorBoundary>{suspense(<C />)}</ErrorBoundary>);
    await act(async () => {
      task.reject(reason);
    });
    expect(h.caught).toEqual([reason]);
  },
);

test.each(
  [
    [0, 1, 2],
    [2, 1, 0],
    [1, 2, 0],
  ].map((order) => ({ order })),
)('all success orders yield one complete snapshot: $order', async ({ order }) => {
  const tasks = [deferred<number>(), deferred<number>(), deferred<number>()];
  const [a, b, c] = tasks;
  if (!a || !b || !c) throw new Error('missing task');
  const snapshots: number[][] = [];
  const C = holo({
    view: ({ a, b, c }: { a: number; b: number; c: number }) => {
      snapshots.push([a, b, c]);
      return (
        <span>
          {a}:{b}:{c}
        </span>
      );
    },
    read: { a: atom(a.promise), b: atom(b.promise), c: atom(c.promise) },
  });
  const h = createHarness();
  await h.render(suspense(<C />));
  for (const index of order) {
    await act(async () => {
      tasks[index]?.resolve(index + 1);
    });
  }
  expect(h.container.textContent).toBe('1:2:3');
  expect(snapshots).toEqual([[1, 2, 3]]);
});

test('undefined is resolved state rather than a pending marker', async () => {
  const task = deferred<undefined>();
  const store = createStore();
  const count = atom(0);
  let renders = 0;
  const C = holo({
    view: ({ value, count }: { value: undefined; count: number }) => {
      renders++;
      return (
        <span>
          {String(value)}:{count}
        </span>
      );
    },
    read: { value: atom(task.promise), count },
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  await act(async () => {
    task.resolve(undefined);
  });
  expect(consoleError).not.toHaveBeenCalled();
  const initial = renders;
  await act(async () => {
    store.set(count, 1);
  });
  expect(h.container.textContent).toBe('undefined:1');
  expect(renders).toBe(initial + 1);
  // Also reproduced without holo in native-async.browser.test.tsx.
  expect(consoleError.mock.calls).toHaveLength(1);
  expect(String(consoleError.mock.calls[0]?.[0])).toContain('did not call use() when it finished');
  consoleError.mockClear();
});

test('replacement before first commit escapes a never-settling promise', async () => {
  const task = deferred<number>();
  const source = atom(task.promise);
  const store = createStore();
  const C = holo({
    view: ({ value }: { value: number }) => <span>{value}</span>,
    read: { value: source },
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  await act(async () => {
    store.set(source, Promise.resolve(7));
  });
  expect(h.container.textContent).toBe('7');
});

test('the same binding atom still works for a native hook consumer', async () => {
  const source = atom(Promise.resolve(3));
  function Native() {
    return <span>{useAtomValue(source)}</span>;
  }
  const C = holo({
    view: ({ value }: { value: number }) => <span>{value}</span>,
    read: { value: source },
  });
  const h = createHarness();
  await h.render(
    suspense(
      <>
        <Native />
        <C />
      </>,
    ),
  );
  expect(h.container.textContent).toBe('33');
});

test('non-native PromiseLike values resolve and remain ready on later sync updates', async () => {
  const task = deferred<number>();
  const thenable: PromiseLike<number> = { then: task.promise.then.bind(task.promise) };
  const store = createStore();
  const count = atom(0);
  const C = holo({
    view: ({ value, count }: { value: number; count: number }) => (
      <span>
        {value}:{count}
      </span>
    ),
    read: { value: atom(thenable), count },
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  await act(async () => {
    task.resolve(5);
  });
  await act(async () => {
    store.set(count, 1);
  });
  expect(h.container.textContent).toBe('5:1');
});

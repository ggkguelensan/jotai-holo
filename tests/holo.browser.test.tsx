import { atom, createStore, Provider } from 'jotai';
import { act, StrictMode, Suspense, startTransition, type ComponentProps } from 'react';
import { expect, expectTypeOf, test, vi } from 'vitest';
import {
  holo,
  eventAtom,
  subscribeEvent,
  useImperativeHolo,
  type HoloImperative,
} from '../src/index.js';
import { createModel } from '../src/model-registry.js';
import { createHarness, deferred, suspense } from './browser-harness.js';

test('initial input and each changed field write after commit, without replay or unrelated updates', async () => {
  const received: unknown[] = [];
  const changed = atom(null, (_get, _set, value: string) => {
    received.push(value);
  });
  const Connected = holo({
    view: (_props: { term: string; other: number }) => null,
    inputProps: { term: changed },
  });
  const h = createHarness();
  const tree = (term: string, other = 0) => (
    <StrictMode>
      <Connected term={term} other={other} />
    </StrictMode>
  );
  await h.render(tree('a'));
  expect(received).toEqual(['a']);
  await h.render(tree('a', 1));
  expect(received).toEqual(['a']);
  await h.render(tree('b', 1));
  expect(received).toEqual(['a', 'b']);
  await h.unmount();
  expect(received).toEqual(['a', 'b']);
});

test('each input binding compares independently, and fixed props win', async () => {
  const name = vi.fn(),
    count = vi.fn();
  const Connected = holo({
    view: (_props: { name: string; count: number; fixed: string }) => null,
    inputProps: {
      name: atom(null, (_g, _s, v: string) => name(v)),
      count: atom(null, (_g, _s, v: number) => count(v)),
      fixed: atom(null, (_g, _s, v: string) => name(v)),
    },
    staticProps: { fixed: 'fixed' },
  });
  const h = createHarness();
  await h.render(<Connected name="a" count={1} />);
  await h.render(<Connected name="a" count={2} />);
  expect(name.mock.calls).toEqual([['a'], ['fixed']]);
  expect(count.mock.calls).toEqual([[1], [2]]);
});

test('input subscriptions are absent and direct targets may be native writable state or event atoms', async () => {
  const $term = atom('');
  const mounted = vi.fn();
  $term.onMount = mounted;
  const changed = eventAtom<string>();
  const received = vi.fn();
  const store = createStore();
  const stop = subscribeEvent(store, changed, received);
  const Connected = holo({
    view: (_props: { term: string; fact: string }) => null,
    inputProps: { term: $term, fact: changed },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Connected term="desk" fact="opened" />
    </Provider>,
  );
  expect(store.get($term)).toBe('desk');
  expect(mounted).not.toHaveBeenCalled();
  expect(received).toHaveBeenCalledTimes(1);
  stop();
});

test('two Views share one resource but preserve separate input values and release at last owner', async () => {
  const connect = vi.fn(() => stop);
  const stop = vi.fn();
  const resource = { connect };
  const received = vi.fn();
  const changed = atom(null, (_g, _s, v: string) => received(v));
  const $$owner0 = createModel({ create: () => ({}), resources: () => [resource] });
  const Connected = holo({
    models: { _connections: $$owner0 },
    view: (_props: { term: string }) => null,
    inputProps: { term: changed },
  });
  const h = createHarness();
  await h.render(
    <StrictMode>
      <Connected key="a" term="a" />
      <Connected key="b" term="b" />
    </StrictMode>,
  );
  expect(connect).toHaveBeenCalledTimes(1);
  expect(received.mock.calls).toEqual([['a'], ['b']]);
  await h.render(
    <StrictMode>
      <Connected key="b" term="b" />
    </StrictMode>,
  );
  expect(stop).not.toHaveBeenCalled();
  expect(received).toHaveBeenCalledTimes(2);
  await h.unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});

test('pending state delays ownership and input writes; settled async state does not add renders on ordinary updates', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const pending = deferred<string>();
  const $async = atom(pending.promise);
  const $count = atom(0);
  const write = vi.fn();
  const connect = vi.fn(() => () => {});
  const rendered = vi.fn();
  const $$owner1 = createModel({ create: () => ({}), resources: () => [{ connect }] });
  const Connected = holo({
    models: { _connections: $$owner1 },
    view: ({ text, count }: { text: string; count: number; term: string }) => {
      rendered();
      return (
        <b>
          {text}:{count}
        </b>
      );
    },
    read: { text: $async, count: $count },
    inputProps: { term: atom(null, (_g, _s, v: string) => write(v)) },
  });
  const h = createHarness();
  const store = createStore();
  await h.render(<Provider store={store}>{suspense(<Connected term="a" />)}</Provider>);
  expect(connect).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  await act(async () => pending.resolve('ready'));
  expect(h.container.textContent).toBe('ready:0');
  expect(write.mock.calls).toEqual([['a']]);
  const before = rendered.mock.calls.length;
  await act(async () => store.set($count, 1));
  expect(h.container.textContent).toBe('ready:1');
  expect(rendered).toHaveBeenCalledTimes(before + 1);
  expect(connect).toHaveBeenCalledTimes(1);
  const errors = consoleError.mock.calls;
  consoleError.mockRestore();
  expect(
    errors.every((args) => String(args[0]).includes('This library called use() to suspend')),
  ).toBe(true);
});

test('abandoned transition props do not reach input targets', async () => {
  const never = new Promise(() => {});
  const write = vi.fn();
  function View({ term }: { term: string }) {
    if (term === 'abandoned') throw never;
    return <b>{term}</b>;
  }
  const Connected = holo({
    view: View,
    inputProps: { term: atom(null, (_g, _s, v: string) => write(v)) },
  });
  const h = createHarness();
  await h.render(suspense(<Connected term="first" />));
  await h.transition(suspense(<Connected term="abandoned" />));
  await h.render(suspense(<Connected term="last" />));
  expect(write.mock.calls).toEqual([['first'], ['last']]);
});

test('temporary Suspense preserves resources and does not replay input, real unmount releases', async () => {
  const pending = deferred<string>();
  const $text = atom<string | Promise<string>>('ready');
  const write = vi.fn(),
    stop = vi.fn(),
    connect = vi.fn(() => stop);
  const $$owner2 = createModel({ create: () => ({}), resources: () => [{ connect }] });
  const Connected = holo({
    models: { _connections: $$owner2 },
    view: ({ text }: { text: string; term: string }) => <b>{text}</b>,
    read: { text: $text },
    inputProps: { term: atom(null, (_g, _s, v: string) => write(v)) },
  });
  const h = createHarness();
  const store = createStore();
  const tree = (
    <StrictMode>
      <Provider store={store}>{suspense(<Connected term="a" />)}</Provider>
    </StrictMode>
  );
  await h.render(tree);
  await act(async () => store.set($text, pending.promise));
  expect(stop).not.toHaveBeenCalled();
  await act(async () => pending.resolve('resolved'));
  expect(connect).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenCalledTimes(1);
  await h.unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});

test('key and store replacement clean old resources before new input arrives', async () => {
  const events: string[] = [];
  const $$search = createModel({
    initial: '',
    create: (id) => ({
      id,
      changed: atom(null, (_g, _s, v: string) => {
        events.push(`${id}:${v}`);
      }),
    }),
    resources: (model) => [
      {
        connect() {
          events.push(`connect:${model.id}`);
          return () => {
            events.push(`stop:${model.id}`);
          };
        },
      },
    ],
  });
  const Connected = holo({
    models: { search: (input: { id: string }) => $$search({ key: [input.id], initial: input.id }) },
    view: (_props: { term: string }) => null,
    inputProps: ({ search }) => ({ term: search.changed }),
  });
  const h = createHarness();
  const first = createStore(),
    second = createStore();
  const tree = (id: string, store = first) => (
    <Provider store={store}>
      <Connected id={id} term="desk" />
    </Provider>
  );
  await h.render(tree('a'));
  await h.render(tree('b'));
  await h.render(tree('b', second));
  expect(events).toEqual([
    'connect:a',
    'a:desk',
    'stop:a',
    'connect:b',
    'b:desk',
    'stop:b',
    'connect:b',
    'b:desk',
  ]);
});

test('input facts reach connected analytics resources and committed imperative methods', async () => {
  const event = eventAtom<string>();
  const tracked = vi.fn(),
    called = vi.fn();
  const store = createStore();
  function View({
    imperative,
  }: {
    term: string;
    imperative: HoloImperative<{ onInput(value: string): void }>;
  }) {
    useImperativeHolo(imperative, { onInput: called });
    return null;
  }
  const $$owner3 = createModel({
    create: () => ({}),
    resources: () => [{ connect: (store) => subscribeEvent(store, event, tracked) }],
  });
  const Connected = holo({
    models: { _connections: $$owner3 },
    view: View,
    inputProps: { term: event },
    imperative: { onInput: event },
  });
  const h = createHarness();
  await h.render(
    <StrictMode>
      <Provider store={store}>
        <Connected term="a" />
      </Provider>
    </StrictMode>,
  );
  expect(called.mock.calls).toEqual([['a']]);
  expect(tracked).toHaveBeenCalledTimes(1);
  await h.unmount();
  store.set(event, 'late');
  expect(tracked).toHaveBeenCalledTimes(1);
  expect(called).toHaveBeenCalledTimes(1);
});

test('input errors are isolated and async failures are reported', async () => {
  const error = new Error('input failed');
  const onError = vi.fn();
  const other = vi.fn();
  const Connected = holo({
    view: (_props: { a: string; b: string; c: string }) => null,
    onError,
    inputProps: {
      a: atom(null, () => {
        throw error;
      }),
      b: atom(null, (_g, _s, v: string) => other(v)),
      c: atom(null, async () => {
        throw error;
      }),
    },
  });
  const h = createHarness();
  await h.render(<Connected a="a" b="b" c="c" />);
  expect(other.mock.calls).toEqual([['b']]);
  expect(onError.mock.calls).toEqual([[error], [error]]);
});

function typeChecks() {
  const changed = atom(null, (_g, _s, v: string) => {});
  const Connected = holo({
    view: (_props: { term: string }) => null,
    inputProps: { term: changed },
  });
  expectTypeOf<ComponentProps<typeof Connected>>().toEqualTypeOf<{ term: string }>();
  // @ts-expect-error Input bindings do not provide required View props.
  const missing = <Connected />;
  // @ts-expect-error Input payload must match the incoming prop.
  holo({ view: (_props: { term: string }) => null, inputProps: { term: atom(0) } });
  // @ts-expect-error Unknown input prop.
  holo({ view: (_props: { term: string }) => null, inputProps: { missing: changed } });
  holo({
    view: (_props: { term: string }) => null,
    read: { term: atom('') },
    // @ts-expect-error Generated read props are not external inputs.
    inputProps: { term: changed },
  });
  void missing;
}
void typeChecks;

test('input prop names are checked against own bindings rather than Object.prototype', async () => {
  const received = vi.fn();
  const Connected = holo({
    view: (_props: { toString: string }) => null,
    inputProps: { toString: atom(null, (_get, _set, value: string) => received(value)) },
  });
  const h = createHarness();
  await h.render(<Connected toString="value" />);
  expect(received.mock.calls).toEqual([['value']]);
});

import { createStore, Provider } from 'jotai';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { act, startTransition, StrictMode, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { holo } from '../src/holo.js';
import { stateAtom } from '../src/state-atom.js';

const disposers: (() => Promise<void>)[] = [];

beforeEach(() => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(async () => {
  for (const dispose of disposers.splice(0)) await dispose();
  Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
});

function createHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let mounted = true;
  async function render(node: ReactNode) {
    await act(() => Promise.resolve(root.render(node)));
  }
  async function transition(node: ReactNode) {
    await act(() => Promise.resolve(startTransition(() => root.render(node))));
  }
  async function unmount() {
    if (!mounted) return;
    mounted = false;
    await act(() => Promise.resolve(root.unmount()));
    container.remove();
  }
  disposers.push(unmount);
  return { container, render, transition, unmount };
}

describe('holo cage', () => {
  test('mounts before initial change, tracks input changes, and unmounts with the latest inputs', async () => {
    const $count = stateAtom(0);
    const $global = stateAtom('');
    const store = createStore();
    const events: string[] = [];
    const inputs: object[] = [];
    function Core({
      count,
      onChange,
    }: {
      count: number;
      onChange: (count: number) => void;
      init: number;
      reactive: string;
    }) {
      return <button onClick={() => onChange(count + 1)}>{count}</button>;
    }
    const Counter = holo({
      core: Core,
      state: { count: $count },
      actions: { onChange: $count },
      bindProps: { init: 5 },
      cage: {
        onMount(get, set, ctx) {
          events.push(`mount:${get($count)}:${ctx.props.init}`);
          set($count, ctx.props.init * 2);
        },
        onChange(get, set, ctx) {
          events.push(`change:${get($count)}:${ctx.props.reactive}`);
          inputs.push(ctx.props);
          set($global, ctx.props.reactive);
        },
        onUnmount(_get, set, ctx) {
          events.push(`unmount:${ctx.props.reactive}`);
          set($count, 0);
        },
      },
    });
    const harness = createHarness();
    const extra = { init: 99, count: -1 };
    await harness.render(
      <Provider store={store}>
        <Counter {...extra} reactive="first" />
      </Provider>,
    );
    expect(events).toEqual(['mount:0:5', 'change:10:first']);
    expect(inputs).toEqual([{ init: 5, reactive: 'first' }]);
    expect(harness.container.textContent).toBe('10');
    expect(store.get($global)).toBe('first');

    await harness.render(
      <Provider store={store}>
        <Counter reactive="first" />
      </Provider>,
    );
    await act(() => Promise.resolve(store.set($count, 11)));
    expect(events).toHaveLength(2);
    expect(harness.container.textContent).toBe('11');

    await harness.render(
      <Provider store={store}>
        <Counter reactive="second" />
      </Provider>,
    );
    expect(events).toEqual(['mount:0:5', 'change:10:first', 'change:11:second']);
    expect(store.get($global)).toBe('second');
    await harness.unmount();
    expect(events.at(-1)).toBe('unmount:second');
    expect(store.get($count)).toBe(0);
  });

  test('compares prop values shallowly without requiring a memoized props object', async () => {
    const events: string[] = [];
    function Core(_props: { data?: object; value: number }) {
      return null;
    }
    const Connected = holo({
      core: Core,
      cage: {
        onChange: (_get, _set, ctx) => {
          events.push(String(ctx.props.value));
        },
      },
    });
    const harness = createHarness();
    const data = {};
    await harness.render(<Connected data={data} value={NaN} />);
    await harness.render(<Connected data={data} value={NaN} />);
    expect(events).toHaveLength(1);
    await harness.render(<Connected data={{}} value={NaN} />);
    expect(events).toHaveLength(2);
    await harness.render(<Connected value={NaN} />);
    expect(events).toHaveLength(3);
  });

  test('binds lifecycle reads and writes to each nearest store and reopens on store replacement', async () => {
    const $name = stateAtom('');
    const $value = stateAtom('');
    const first = createStore();
    const second = createStore();
    first.set($name, 'first');
    second.set($name, 'second');
    const events: string[] = [];
    function Core(_props: { reactive: string }) {
      return null;
    }
    const Connected = holo({
      core: Core,
      cage: {
        onMount(get, set, ctx) {
          events.push(`mount:${get($name)}:${ctx.props.reactive}`);
          set($value, ctx.props.reactive);
        },
        onChange(get, _set, ctx) {
          events.push(`change:${get($name)}:${ctx.props.reactive}`);
        },
        onUnmount(get, set, ctx) {
          events.push(`unmount:${get($name)}:${ctx.props.reactive}`);
          set($value, 'closed');
        },
      },
    });
    const harness = createHarness();
    await harness.render(
      <Provider store={first}>
        <Connected reactive="old" />
      </Provider>,
    );
    await harness.render(
      <Provider store={second}>
        <Connected reactive="new" />
      </Provider>,
    );
    expect(events).toEqual([
      'mount:first:old',
      'change:first:old',
      'unmount:first:old',
      'mount:second:new',
      'change:second:new',
    ]);
    expect(first.get($value)).toBe('closed');
    expect(second.get($value)).toBe('new');
    await harness.unmount();
    expect(events.at(-1)).toBe('unmount:second:new');
    expect(second.get($value)).toBe('closed');
  });

  test('replays mount/change after StrictMode cleanup without entering an update loop', async () => {
    const $count = stateAtom(0);
    const store = createStore();
    const events: string[] = [];
    function Core(_props: { count: number }) {
      return null;
    }
    const Connected = holo({
      core: Core,
      state: { count: $count },
      cage: {
        onMount(_get, set) {
          events.push('mount');
          set($count, 10);
        },
        onChange() {
          events.push('change');
        },
        onUnmount(_get, set) {
          events.push('unmount');
          set($count, 0);
        },
      },
    });
    const harness = createHarness();
    await harness.render(
      <StrictMode>
        <Provider store={store}>
          <Connected />
        </Provider>
      </StrictMode>,
    );
    expect(events).toEqual(['mount', 'change', 'unmount', 'mount', 'change']);
    expect(store.get($count)).toBe(10);
    await harness.unmount();
    expect(events.at(-1)).toBe('unmount');
    expect(store.get($count)).toBe(0);
  });

  test('keeps lifecycle props separate for simultaneous component instances', async () => {
    const events: string[] = [];
    function Core(_props: { id: string }) {
      return null;
    }
    const Connected = holo({
      core: Core,
      cage: {
        onMount: (_get, _set, ctx) => {
          events.push(`mount:${ctx.props.id}`);
        },
        onUnmount: (_get, _set, ctx) => {
          events.push(`unmount:${ctx.props.id}`);
        },
      },
    });
    const harness = createHarness();
    await harness.render(
      <>
        <Connected key="a" id="a" />
        <Connected key="b" id="b" />
      </>,
    );
    await harness.render(<Connected key="b" id="b" />);
    expect(events).toEqual(['mount:a', 'mount:b', 'unmount:a']);
    await harness.unmount();
    expect(events).toEqual(['mount:a', 'mount:b', 'unmount:a', 'unmount:b']);
  });

  test('does not expose props from an abandoned suspended render during unmount', async () => {
    const events: string[] = [];
    const never = new Promise<void>(() => undefined);
    function Core({ value }: { value: string }) {
      if (value === 'uncommitted') throw never;
      return <span>{value}</span>;
    }
    const Connected = holo({
      core: Core,
      cage: {
        onChange: (_get, _set, ctx) => {
          events.push(`change:${ctx.props.value}`);
        },
        onUnmount: (_get, _set, ctx) => {
          events.push(`unmount:${ctx.props.value}`);
        },
      },
    });
    const harness = createHarness();
    await harness.render(
      <Suspense fallback="loading">
        <Connected value="committed" />
      </Suspense>,
    );
    await harness.transition(
      <Suspense fallback="loading">
        <Connected value="uncommitted" />
      </Suspense>,
    );
    expect(harness.container.textContent).toBe('committed');
    await harness.unmount();
    expect(events).toEqual(['change:committed', 'unmount:committed']);
  });
});

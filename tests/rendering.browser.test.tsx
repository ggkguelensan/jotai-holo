import { atom, createStore, Provider, useAtomValue } from 'jotai';
import { selectAtom, splitAtom } from 'jotai/utils';
import { expect, test } from 'vitest';
import { act, Component, createRef, forwardRef, lazy, memo, useEffect, useState } from 'react';
import { holo } from '../src/holo.js';
import { actionAtom } from '../src/action-atom.js';
import { createHarness, suspense } from './browser-harness.js';

test('leaf subscriptions update only their core; actions and parent have zero renders', async () => {
  const $count = atom(0);
  const $label = atom('a');
  const $unrelated = atom(0);
  const store = createStore();
  const calls = { parent: 0, count: 0, label: 0, button: 0 };
  const increment = actionAtom((_get, set) => set($count, (n) => n + 1));
  const Count = holo({
    view: function CountView({ count }: { count: number }) {
      calls.count++;
      return <span data-count>{count}</span>;
    },
    read: { count: $count },
  });
  const Label = holo({
    view: function LabelView({ label }: { label: string }) {
      calls.label++;
      return <span>{label}</span>;
    },
    read: { label: $label },
  });
  const Button = holo({
    view: function ButtonView({ onClick }: { onClick: () => void }) {
      calls.button++;
      return <button onClick={onClick}>increment</button>;
    },
    write: { onClick: increment },
  });
  function Parent() {
    calls.parent++;
    return (
      <>
        <Count />
        <Label />
        <Button />
      </>
    );
  }
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Parent />
    </Provider>,
  );
  const initial = { ...calls };
  await act(async () => store.set($count, 1));
  expect(calls).toEqual({ ...initial, count: initial.count + 1 });
  await act(async () => store.set($unrelated, 1));
  expect(calls).toEqual({ ...initial, count: initial.count + 1 });
  await act(async () => store.set($label, 'b'));
  expect(calls.label).toBe(initial.label + 1);
  expect(calls.parent).toBe(initial.parent);
  expect(calls.button).toBe(initial.button);
});

test('same-value updates and unchanged derived values do not render the core', async () => {
  const $count = atom(0);
  const $even = atom((get) => get($count) % 2 === 0);
  const store = createStore();
  let renders = 0;
  const C = holo({
    view: ({ even }: { even: boolean }) => {
      renders++;
      return <span>{String(even)}</span>;
    },
    read: { even: $even },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  const initial = renders;
  await act(async () => store.set($count, 0));
  await act(async () => store.set($count, 2));
  expect(renders).toBe(initial);
  await act(async () => store.set($count, 3));
  expect(renders).toBe(initial + 1);
});

test('memoized holo skips unrelated parent renders, but forwards changed own props', async () => {
  const $count = atom(0);
  let calls = 0;
  const C = holo({
    view: ({ count, title }: { count: number; title: string }) => {
      calls++;
      return (
        <span>
          {title}:{count}
        </span>
      );
    },
    read: { count: $count },
  });
  let update: ((value: number) => void) | undefined;
  function Parent({ title }: { title: string }) {
    const [, set] = useState(0);
    update = set;
    return <C title={title} />;
  }
  const h = createHarness();
  await h.render(<Parent title="a" />);
  const initial = calls;
  if (!update) throw new Error('Parent missing');
  await act(async () => update?.(1));
  expect(calls).toBe(initial);
  await h.render(<Parent title="b" />);
  expect(calls).toBe(initial + 1);
  expect(h.container.textContent).toBe('b:0');
});

test('action-only bindings never mount or subscribe to their source atom', async () => {
  const $count = atom(0);
  const store = createStore();
  let mounts = 0;
  let renders = 0;
  $count.onMount = () => {
    mounts++;
  };
  const C = holo({
    view: ({ onChange }: { onChange: (n: number) => void }) => {
      renders++;
      return <button onClick={() => onChange(1)}>set</button>;
    },
    write: { onChange: $count },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  const initial = renders;
  await act(async () => store.set($count, 2));
  expect(mounts).toBe(0);
  expect(renders).toBe(initial);
});

test('a multi-write action commits one core render with a consistent snapshot', async () => {
  const $first = atom(0);
  const $second = atom(0);
  const store = createStore();
  const snapshots: number[][] = [];
  const change = actionAtom((_get, set) => {
    set($first, 1);
    set($second, 2);
  });
  const C = holo({
    view: ({ first, second }: { first: number; second: number }) => {
      snapshots.push([first, second]);
      return (
        <span>
          {first}:{second}
        </span>
      );
    },
    read: { first: $first, second: $second },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  const initial = snapshots.length;
  await act(async () => {
    store.set(change);
  });
  expect(snapshots.slice(initial)).toEqual([[1, 2]]);
});

test('selector equality and splitAtom item identity preserve local subscriptions', async () => {
  const item = { id: 1, name: 'a' };
  const $data = atom({ item, other: 0 });
  const $item = selectAtom($data, (v) => v.item);
  const store = createStore();
  let calls = 0;
  const C = holo({
    view: ({ value }: { value: typeof item }) => {
      calls++;
      return <span>{value.name}</span>;
    },
    read: { value: $item },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  const initial = calls;
  await act(async () => store.set($data, { item, other: 1 }));
  expect(calls).toBe(initial);
  const $list = atom([item, { id: 2, name: 'b' }]);
  const $parts = splitAtom($list);
  const [first] = store.get($parts);
  if (!first) throw new Error('Item missing');
  const I = holo({
    view: ({ value }: { value: typeof item }) => {
      calls++;
      return <span>{value.name}</span>;
    },
    read: { value: first },
  });
  await h.render(
    <Provider store={store}>
      <I />
    </Provider>,
  );
  const before = calls;
  await act(async () => store.set($list, [item, { id: 2, name: 'changed' }]));
  expect(calls).toBe(before);
});

test('synchronous child mount writes are visible without a subsequent update', async () => {
  const $count = atom(0);
  const store = createStore();
  function Child() {
    useEffect(() => {
      store.set($count, 1);
    }, []);
    return null;
  }
  const C = holo({
    view: ({ count }: { count: number }) => (
      <>
        <Child />
        <span>{count}</span>
      </>
    ),
    read: { count: $count },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  expect(h.container.textContent).toBe('1');
});

test('intrinsic elements, forwarded refs and React 19 ref props reach the original core', async () => {
  const $label = atom('button');
  const ref = createRef<HTMLButtonElement>();
  const C = holo({ view: 'button', read: { children: $label }, props: { type: 'button' } });
  const h = createHarness();
  await h.render(<C ref={ref} />);
  expect(ref.current).toBe(h.container.querySelector('button'));
  const Forwarded = forwardRef<HTMLInputElement, { label: string }>(function Input(
    { label },
    inputRef,
  ) {
    return <input ref={inputRef} aria-label={label} />;
  });
  const inputRef = createRef<HTMLInputElement>();
  const F = holo({ view: memo(Forwarded), props: { label: 'field' } });
  await h.render(<F ref={inputRef} />);
  expect(inputRef.current?.getAttribute('aria-label')).toBe('field');
});

test('hook consumers inside a core retain normal React context subscriptions', async () => {
  const $count = atom(0);
  const store = createStore();
  const C = holo({
    view: function Core() {
      return <span>{useAtomValue($count)}</span>;
    },
  });
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<C />)}</Provider>);
  await act(async () => store.set($count, 5));
  expect(h.container.textContent).toBe('5');
});

test('static and action-only holo instances create no atom subscriptions', async () => {
  const base = createStore();
  let subscriptions = 0;
  const store: typeof base = {
    ...base,
    sub(...args) {
      subscriptions++;
      return base.sub(...args);
    },
  };
  const save = actionAtom(() => undefined);
  const Static = holo({ view: 'span', props: { children: 'static' } });
  const Action = holo({
    view: 'button',
    write: { onClick: save },
    props: { children: 'save' },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Static />
      <Action />
    </Provider>,
  );
  expect(subscriptions).toBe(0);
});

test('native onMount can publish a queued write to bound state', async () => {
  const $value = atom(0);
  const store = createStore();
  let disposed = false;
  $value.onMount = (setValue) => {
    queueMicrotask(() => setValue(7));
    return () => {
      disposed = true;
    };
  };
  const C = holo({
    view: ({ value }: { value: number }) => <span>{value}</span>,
    read: { value: $value },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  expect(h.container.textContent).toBe('7');
  expect(store.get($value)).toBe(7);
  await h.unmount();
  expect(disposed).toBe(true);
});

test('class and lazy cores retain React component behavior', async () => {
  class ClassView extends Component<{ value: number }> {
    render() {
      return <span>{this.props.value}</span>;
    }
  }
  const ClassBinding = holo({ view: ClassView, read: { value: atom(2) } });
  const LazyView = lazy(async () => ({
    default: ({ value }: { value: number }) => <b>{value}</b>,
  }));
  const LazyBinding = holo({ view: LazyView, read: { value: atom(Promise.resolve(3)) } });
  const h = createHarness();
  await h.render(
    suspense(
      <>
        <ClassBinding />
        <LazyBinding />
      </>,
    ),
  );
  expect(h.container.textContent).toBe('23');
});

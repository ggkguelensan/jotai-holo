import { modelLifetime } from './model-lifetime.js';
import { atom, createStore, Provider } from 'jotai';
import { act, StrictMode, useEffect } from 'react';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { actionAtom, holo } from '../src/index.js';
import { createModel } from '../src/model-registry.js';
import { createHarness, deferred, suspense } from './browser-harness.js';

function createCounter() {
  const $count = atom(0);
  const increment = actionAtom((_get, set) => set($count, (n) => n + 1));
  return { $count, increment };
}
const CounterView = ({ count, onIncrement }: { count: number; onIncrement: () => void }) => (
  <button onClick={onIncrement}>{count}</button>
);

test('default consumers share a model and resources; keyed consumers isolate in the same store', async () => {
  const create = vi.fn(createCounter);
  let active = 0;
  const model = createModel({
    create,
    resources: (_model) => [
      {
        connect: (_store) => {
          active++;
          return () => {
            active--;
          };
        },
      },
    ],
  });
  const Counter = holo({
    models: { model },
    view: CounterView,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ onIncrement: m.increment }),
  });
  const Keyed = holo({
    models: { model: (props: { id: string }) => model({ key: [{ id: props.id }] }) },
    view: CounterView,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ onIncrement: m.increment }),
  });
  expect(create).not.toHaveBeenCalled();
  const h = createHarness();
  const store = createStore();
  const tree = () => (
    <Provider store={store}>
      <Counter />
      <Counter />
      <Keyed id="left" />
      <Keyed id="right" />
    </Provider>
  );
  await h.render(tree());
  expect(create).toHaveBeenCalledTimes(3);
  expect(active).toBe(3);
  await act(async () => h.container.querySelector('button')!.click());
  expect([...h.container.querySelectorAll('button')].map((node) => node.textContent)).toEqual([
    '1',
    '1',
    '0',
    '0',
  ]);
  await h.render(tree());
  expect(create).toHaveBeenCalledTimes(3);
  expect(active).toBe(3);
  await h.unmount();
  expect(active).toBe(0);
});

test('StrictMode replays resource ownership without losing Infinity-retained state', async () => {
  const create = vi.fn(createCounter);
  let active = 0;
  const model = createModel({
    create,
    resources: (_model) => [
      {
        connect: (_store) => {
          active++;
          return () => {
            active--;
          };
        },
      },
    ],
  });
  const Counter = holo({
    models: { model },
    view: CounterView,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ onIncrement: m.increment }),
  });
  const h = createHarness();
  await h.render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  );
  expect(create).toHaveBeenCalledTimes(1);
  expect(active).toBe(1);
  await act(async () => h.container.querySelector('button')!.click());
  expect(h.container.textContent).toBe('1');
  await h.unmount();
  expect(active).toBe(0);
});

test('a model rendered only behind initial Suspense never connects resources', async () => {
  const create = vi.fn(() => ({ $pending: atom(new Promise<string>(() => {})) }));
  const connect = vi.fn();
  const model = createModel({ create, resources: () => [{ connect }] });
  const Pending = holo({
    models: { model: () => model({ key: ['abandoned'] }) },
    view: ({ value }: { value: string }) => <span>{value}</span>,
    read: ({ model: m }) => ({ value: m.$pending }),
  });
  const h = createHarness();
  await h.render(suspense(<Pending />));
  expect(create).toHaveBeenCalledTimes(1);
  expect(connect).not.toHaveBeenCalled();
  await h.unmount();
  expect(connect).not.toHaveBeenCalled();
});

test('model resource connections exist before child lifecycle passive effects emit events', async () => {
  const { bond, eventAtom } = await import('../src/vanilla.js');
  const requested = eventAtom<number>();
  const model = createModel({
    create: () => {
      const $count = atom(0);
      return { $count, link: bond({ trigger: requested, write: $count }) };
    },
    resources: (m) => [{ connect: (store) => m.link.connect(store) }],
  });
  const $$owner0 = modelLifetime({
    onMount(_get, set) {
      set(requested, 5);
    },
    onUnmount(_get, set) {
      set(requested, 9);
    },
  });
  const Counter = holo({
    models: { model, _lifetime: $$owner0 },
    view: ({ count }: { count: number }) => <span>{count}</span>,
    read: ({ model: m }) => ({ count: m.$count }),
  });
  const h = createHarness();
  const store = createStore();
  await h.render(
    <Provider store={store}>
      <Counter />
    </Provider>,
  );
  expect(h.container.textContent).toBe('5');
  await h.unmount();
  expect(store.get(store.get(model()).$count)).toBe(9);
});

test('actions-only model bindings do not evaluate or subscribe to model state', async () => {
  const read = vi.fn(() => {
    throw new Error('unused');
  });
  const write = vi.fn();
  const model = createModel({ create: () => ({ $unused: atom(read), change: actionAtom(write) }) });
  const Button = holo({
    models: { model },
    view: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>change</button>,
    write: ({ model: m }) => ({ onClick: m.change }),
  });
  const h = createHarness();
  await h.render(<Button />);
  await act(async () => h.container.querySelector('button')!.click());
  expect(write).toHaveBeenCalledTimes(1);
  expect(read).not.toHaveBeenCalled();
});

function typeChecks() {
  const model = createModel({ create: createCounter });
  const Counter = holo({
    models: { model: (props: { id: string }) => model({ key: [props.id] }) },
    view: CounterView,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ onIncrement: m.increment }),
  });
  const valid = <Counter id="one" />;
  // @ts-expect-error Selector props are public required inputs.
  const missing = <Counter />;
  // @ts-expect-error Bound state cannot be supplied by consumers.
  const overridden = <Counter id="one" count={2} />;
  expectTypeOf(model().read).toBeFunction();
  void [valid, missing, overridden];
}
void typeChecks;

test('retainTime zero remains stable through StrictMode effect replay and evicts after unmount', async () => {
  const create = vi.fn(createCounter);
  const model = createModel({ create, retainTime: 0 });
  const store = createStore();
  const Counter = holo({
    models: { model },
    view: CounterView,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ onIncrement: m.increment }),
  });
  const h = createHarness();
  await h.render(
    <StrictMode>
      <Provider store={store}>
        <Counter />
      </Provider>
    </StrictMode>,
  );
  await act(async () => h.container.querySelector('button')!.click());
  expect(h.container.textContent).toBe('1');
  await h.unmount();
  await new Promise((r) => setTimeout(r, 5));
  expect(store.get(store.get(model()).$count)).toBe(0);
});

test('a native asynchronous model atom resolves before its typed bindings are selected', async () => {
  const model = createCounter();
  const $model = atom(Promise.resolve(model));
  const Counter = holo({
    models: { model: $model },
    view: CounterView,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ onIncrement: m.increment }),
  });
  const h = createHarness();
  await h.render(suspense(<Counter />));
  expect(h.container.querySelector('button')!.textContent).toBe('0');
  await act(async () => h.container.querySelector('button')!.click());
  expect(h.container.querySelector('button')!.textContent).toBe('1');
});

test('temporary Suspense hiding preserves the model lease and finite-retention state until actual unmount', async () => {
  const request = deferred<string>();
  const create = vi.fn(() => ({
    ...createCounter(),
    $text: atom<string | Promise<string>>('ready'),
  }));
  let active = 0;
  const Model = createModel({
    retainTime: 0,
    create,
    resources: (_model) => [
      {
        connect: (_store) => {
          active++;
          return () => {
            active--;
          };
        },
      },
    ],
  });
  const Counter = holo({
    models: { model: Model },
    view: ({ count, text }: { count: number; text: string }) => (
      <output>
        {count}:{text}
      </output>
    ),
    read: ({ model: m }) => ({ count: m.$count, text: m.$text }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<Counter />)}</Provider>);
  const model = store.get(Model());
  await act(async () => store.set(model.increment));
  await act(async () => store.set(model.$text, request.promise));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
  expect(active).toBe(1);
  expect(create).toHaveBeenCalledTimes(1);
  await act(async () => {
    request.resolve('resolved');
    await request.promise;
  });
  expect(h.container.textContent).toBe('1:resolved');
  await h.unmount();
  expect(active).toBe(0);
});

test('key changes, return navigation and store replacement preserve the correct independent models', async () => {
  const create = vi.fn(createCounter);
  const connected: string[] = [];
  const model = createModel({
    create,
    resources: (m) => [
      {
        connect(store) {
          connected.push('mount:' + store.get(m.$count));
          return () => {
            connected.push('unmount:' + store.get(m.$count));
          };
        },
      },
    ],
  });
  const Counter = holo({
    models: { model: (props: { id: string }) => model({ key: [props.id] }) },
    view: CounterView,
    read: ({ model: m }) => ({ count: m.$count }),
    write: ({ model: m }) => ({ onIncrement: m.increment }),
  });
  const a = createStore();
  const b = createStore();
  const h = createHarness();
  const tree = (id: string, store = a) => (
    <Provider store={store}>
      <Counter id={id} />
    </Provider>
  );
  await h.render(tree('one'));
  await act(async () => h.container.querySelector('button')!.click());
  await h.render(tree('two'));
  expect(h.container.textContent).toBe('0');
  await h.render(tree('one'));
  expect(h.container.textContent).toBe('1');
  await h.render(tree('one', b));
  expect(h.container.textContent).toBe('0');
  await act(async () => h.container.querySelector('button')!.click());
  expect(a.get(a.get(model({ key: ['one'] })).$count)).toBe(1);
  expect(b.get(b.get(model({ key: ['one'] })).$count)).toBe(1);
  expect(create).toHaveBeenCalledTimes(3);
  await h.unmount();
  expect(connected).toEqual([
    'mount:0',
    'unmount:1',
    'mount:0',
    'unmount:0',
    'mount:1',
    'unmount:1',
    'mount:0',
    'unmount:1',
  ]);
});

import { createRoot } from 'react-dom/client';
import { createRef, Component, StrictMode, Suspense, useState, type ReactNode } from 'react';
import { Provider, atom } from 'jotai';
import { createStore } from 'jotai/vanilla';
import {
  holo,
  useImperativeHolo,
  type HoloImperative,
  actionAtom,
  eventAtom,
  subscribeEvent,
  stateAtom,
  ion,
  prism,
  bond,
  holoMatch,
  holoList,
} from 'jotai-holo';

import { pipe, modelRegistry, modelConnection } from 'jotai-holo/model';
import { queryAtoms } from 'jotai-holo/query';
import { createFormModel, holoForm } from 'jotai-holo/rhf';
import { QueryClient, queryOptions } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';

const store = createStore();
let ownActive = 0;
let ownCreates = 0;
let resolveOwn: (value: string) => void = () => {};
const OwnModel = pipe(
  () => {
    ownCreates++;
    const $value = atom(0);
    const $text = atom<string | Promise<string>>('ready');
    const incremented = eventAtom<number>();
    const increment = actionAtom((get, set) => {
      set($value, (n) => n + 1);
      set(incremented, get($value));
    });
    return { $value, $text, incremented, increment };
  },
  modelRegistry({ retainTime: 0 }),
  modelConnection(() => {
    ownActive++;
    return () => {
      ownActive--;
    };
  }),
);
const imperativeCalls: number[] = [];
function OwnCounterView({
  value,
  text,
  onClick,
  imperative,
}: {
  value: number;
  text: string;
  onClick: () => void;
  imperative: HoloImperative<{ onIncremented(value: number): void }>;
}) {
  useImperativeHolo(imperative, {
    onIncremented(value) {
      imperativeCalls.push(value);
    },
  });
  return (
    <button id="native-model" onClick={onClick}>
      model:{value}/{text}
    </button>
  );
}
const OwnCounter = holo({
  models: { counter: OwnModel },
  view: OwnCounterView,
  read: ({ counter }) => ({ value: counter.$value, text: counter.$text }),
  write: ({ counter }) => ({ onClick: counter.increment }),
  imperative: ({ counter }) => ({ onIncremented: counter.incremented }),
});
const FormModel = modelRegistry()(
  createFormModel({
    initial: { name: 'Ada' },
    options: (initial) => ({
      defaultValues: initial,
      resolver: async (values: { name: string }) => ({
        values: { name: values.name.toUpperCase() },
        errors: {},
      }),
    }),
  }),
);
function FormView() {
  const form = useFormContext<{ name: string }>();
  const [saved, save] = useState('');
  return (
    <form id="form-model" onSubmit={form.handleSubmit((values) => save(values.name))}>
      <input {...form.register('name')} />
      <button>Save</button>
      <output>{saved}</output>
    </form>
  );
}
const OwnForm = holoForm({
  form: ({ model }) => model.form,
  models: { model: FormModel },
  view: FormView,
});
const queryClient = new QueryClient();
const detailQO = () =>
  queryOptions({ queryKey: ['compat'], queryFn: async () => 'Ready', staleTime: Infinity });
queryClient.setQueryData(detailQO().queryKey, 'Ready');
const query = queryAtoms({
  query: detailQO,
  client: queryClient,
  prism: { $data: (result) => result.data },
});
const QueryView = holo({
  view: ({ data }: { data: string | undefined }) => <output>query:{data}</output>,
  read: { data: query.$data },
});

const $count = stateAtom(0);
const $double = ion($count, (count) => count * 2);
const { $parity } = prism($count, { $parity: (count) => count % 2 });
const increment = actionAtom((_get, set) => set($count, (count) => count + 1));
const changed = eventAtom<number>();
const routing = bond({ trigger: changed, write: $count });
const stopBond = routing.connect(store);
let deliveries = 0;
const stopEvent = subscribeEvent(store, changed, () => {
  deliveries++;
});
const lifecycle: string[] = [];
const Counter = holo({
  view: ({
    count,
    doubled,
    parity,
    onIncrement,
    title,
  }: {
    count: number;
    doubled: number;
    parity: number;
    onIncrement: () => void;
    title: string;
  }) => (
    <button id="counter" onClick={() => onIncrement()}>
      {title}:{count}/{doubled}/{parity}
    </button>
  ),
  read: { count: $count, doubled: $double, parity: $parity },
  write: { onIncrement: increment },
  props: { title: 'counter' },
  models: {
    owner: pipe(
      () => ({}),
      modelRegistry({}),
      modelConnection(() => {
        lifecycle.push('mount');
        return () => {
          lifecycle.push('unmount');
        };
      }),
    ),
  },
  input: {
    title: atom(null, (_get, _set, _title: string) => {
      lifecycle.push('change');
    }),
  },
});
const inputRef = createRef<HTMLInputElement>();
const Input = holo({
  view: 'input',
  props: { defaultValue: 'ref works' },
});
const Match = holoMatch({ source: atom<'input'>('input'), cases: { input: Input } });
const $items = atom<readonly number[]>([1, 2]);
const List = holoList({
  source: $items,
  view: ({ item }: { item: number }) => <li>{item}</li>,
  getKey: (item) => item,
  mapItem: (item) => ({ item }),
});
let settle: (value: string) => void = () => {};
const firstPromise = new Promise<string>((resolve) => {
  settle = resolve;
});
const $async = atom<string | Promise<string>>(firstPromise);
let models = 0;
const Model = pipe(
  (id: string) => {
    models++;
    return { $value: atom((get) => `${id}:${get($count)}`), $async };
  },
  modelRegistry({ initial: 'a' }),
);
const adaptedRef = createRef<HTMLInputElement>();
const AsyncView = holo({
  models: {
    selected: (input: { 'data-instance': string }) =>
      Model({ key: [input['data-instance']], initial: input['data-instance'] }),
  },
  view: ({ value, text }: { value: string; text: string }) => (
    <output id="adapted">
      {value}/{text}
    </output>
  ),
  read: ({ selected }) => ({ value: selected.$value, text: selected.$async }),
});
const AdaptedInput = holo({
  models: {
    selected: (input: { 'data-instance': string }) =>
      Model({ key: [input['data-instance']], initial: input['data-instance'] }),
  },
  view: 'input',
  read: ({ selected }) => ({ value: selected.$value }),
  props: { readOnly: true },
});
const PlainAsync = holo({
  view: ({ text }: { text: string }) => <output id="plain">{text}</output>,
  read: { text: $async },
});
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <p id="error">failed</p> : this.props.children;
  }
}
const root = createRoot(document.getElementById('root')!);
function render(id = 'a') {
  root.render(
    <StrictMode>
      <Provider store={store}>
        <Counter />
        <Suspense fallback={<b id="model-loading">model loading</b>}>
          <OwnCounter />
        </Suspense>
        <OwnForm />
        <QueryView />
        <Match ref={inputRef} />
        <ul>
          <List />
        </ul>
        <Boundary>
          <Suspense fallback={<p id="loading">waiting</p>}>
            <PlainAsync />
            <AsyncView data-instance={id} />
            <AdaptedInput data-instance={id} ref={adaptedRef} />
          </Suspense>
        </Boundary>
      </Provider>
    </StrictMode>,
  );
}
Reflect.set(window, 'compat', {
  resolve: () => settle('ready'),
  suspendModel: () =>
    store.set(
      store.get(OwnModel()).$text,
      new Promise<string>((resolve) => {
        resolveOwn = resolve;
      }),
    ),
  resolveModel: () => resolveOwn('resolved'),
  updateQuery: () => queryClient.setQueryData(detailQO().queryKey, 'Updated'),
  emit: (count: number) => store.set(changed, count),
  replace: (value: string | Promise<string>) => store.set($async, value),
  reject: () => store.set($async, Promise.reject(new Error('expected rejection'))),
  reorder: () => store.set($items, [2, 1]),
  scope: (id: string) => render(id),
  snapshot: () => ({
    count: store.get($count),
    ownActive,
    ownCreates,
    imperativeCalls,
    queryObservers: queryClient
      .getQueryCache()
      .findAll()
      .reduce((n, q) => n + q.getObserversCount(), 0),
    deliveries,
    lifecycle,
    models,
    ref: inputRef.current?.value,
    adaptedRef: adaptedRef.current?.value,
  }),
  unmount: () => {
    root.unmount();
    stopBond();
    stopEvent();
    queryClient.clear();
  },
});
render();

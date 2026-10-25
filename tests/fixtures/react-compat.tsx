import { createRoot } from 'react-dom/client';
import { createRef, Component, StrictMode, Suspense, type ReactNode } from 'react';
import { Provider, atom } from 'jotai';
import { createStore } from 'jotai/vanilla';
import { molecule, ScopeProvider, createScope } from 'bunshi/react';
import {
  holo,
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
import { holoMolecule } from 'jotai-holo/bunshi';

const store = createStore();
const $count = stateAtom(0);
const $double = ion($count, (count) => count * 2);
const { $parity } = prism($count, { $parity: (count) => count % 2 });
const increment = actionAtom((_get, set) => set($count, (count) => count + 1));
const changed = eventAtom<number>();
const routing = bond({ trigger: changed, yield: $count });
const stopBond = routing.connect(store);
let deliveries = 0;
const stopEvent = subscribeEvent(store, changed, () => {
  deliveries++;
});
const lifecycle: string[] = [];
const Counter = holo({
  core: ({
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
  state: { count: $count, doubled: $double, parity: $parity },
  actions: { onIncrement: increment },
  bindProps: { title: 'counter' },
  cage: {
    onMount() {
      lifecycle.push('mount');
    },
    onChange() {
      lifecycle.push('change');
    },
    onUnmount() {
      lifecycle.push('unmount');
    },
  },
});
const inputRef = createRef<HTMLInputElement>();
const Input = holo({
  core: 'input',
  bindProps: { defaultValue: 'ref works' },
  cage: { onMount() {} },
});
const Match = holoMatch({ source: atom<'input'>('input'), cases: { input: Input } });
const $items = atom<readonly number[]>([1, 2]);
const List = holoList({
  source: $items,
  core: ({ item }: { item: number }) => <li>{item}</li>,
  getKey: (item) => item,
  mapItem: (item) => ({ item }),
});
let settle: (value: string) => void = () => {};
const firstPromise = new Promise<string>((resolve) => {
  settle = resolve;
});
const $async = atom<string | Promise<string>>(firstPromise);
const Scope = createScope('a');
let models = 0;
const Model = molecule((_mol, scope) => {
  const id = scope(Scope);
  models++;
  return { $value: atom((get) => `${id}:${get($count)}`), $async };
});
const select = holoMolecule(Model);
const adaptedRef = createRef<HTMLInputElement>();
const AsyncView = holo({
  core: ({ value, text }: { value: string; text: string }) => (
    <output id="adapted">
      {value}/{text}
    </output>
  ),
  state: { value: select((model) => model.$value), text: select((model) => model.$async) },
});
const AdaptedInput = holo({
  core: 'input',
  state: { value: select((model) => model.$value) },
  bindProps: { readOnly: true },
});
const PlainAsync = holo({
  core: ({ text }: { text: string }) => <output id="plain">{text}</output>,
  state: { text: $async },
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
        <Match ref={inputRef} />
        <ul>
          <List />
        </ul>
        <Boundary>
          <Suspense fallback={<p id="loading">waiting</p>}>
            <PlainAsync />
            <ScopeProvider scope={Scope} value={id}>
              <AsyncView />
              <AdaptedInput ref={adaptedRef} />
            </ScopeProvider>
          </Suspense>
        </Boundary>
      </Provider>
    </StrictMode>,
  );
}
Reflect.set(window, 'compat', {
  resolve: () => settle('ready'),
  emit: (count: number) => store.set(changed, count),
  replace: (value: string | Promise<string>) => store.set($async, value),
  reject: () => store.set($async, Promise.reject(new Error('expected rejection'))),
  reorder: () => store.set($items, [2, 1]),
  scope: (id: string) => render(id),
  snapshot: () => ({
    count: store.get($count),
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
  },
});
render();

import type { DocsTranslator } from './docs-i18n.js';
import { Provider, useStore } from 'jotai';
import { createStore } from 'jotai/vanilla';
import { useEffect, useState, type ComponentType } from 'react';
import {
  actionAtom,
  bond,
  eventAtom,
  holo,
  holoList,
  holoMatch,
  ion,
  prism,
  stateAtom,
  subscribeEvent,
} from 'jotai-holo';

// Each mounted demo owns a store. Define models and bindings before rendering.

// #region counter
function createCounterDemo(t: DocsTranslator) {
  const $count = stateAtom(0);
  const $double = stateAtom((get) => get($count) * 2);
  const increment = actionAtom((_get, set, amount: number) =>
    set($count, (count) => count + amount),
  );
  function CounterView({
    count,
    doubled,
    onIncrement,
    title,
  }: {
    count: number;
    doubled: number;
    onIncrement: (amount: number) => void;
    title: string;
  }) {
    return (
      <div className="demo-counter">
        <span className="demo-eyebrow">{title}</span>
        <output className="demo-number" aria-live="polite">
          {count}
        </output>
        <p>
          {t('Derived × 2')}: <strong>{doubled}</strong>
        </p>
        <div className="demo-controls">
          <button type="button" onClick={() => onIncrement(-1)} aria-label={t('Decrement')}>
            −
          </button>
          <button type="button" onClick={() => onIncrement(1)} aria-label={t('Increment')}>
            +
          </button>
        </div>
      </div>
    );
  }
  return holo({
    core: CounterView,
    state: { count: $count, doubled: $double },
    actions: { onIncrement: increment },
    bindProps: { title: t('One model, ordinary props') },
  });
}
// #endregion counter

// #region ion
function createIonDemo(t: DocsTranslator) {
  const $quantity = stateAtom(2);
  const $discount = stateAtom(false);
  const $total = ion(
    { quantity: $quantity, discount: $discount },
    ({ quantity, discount }) => quantity * 25 * (discount ? 0.8 : 1),
  );
  function CartView({
    quantity,
    discount,
    total,
    onQuantity,
    onDiscount,
  }: {
    quantity: number;
    discount: boolean;
    total: number;
    onQuantity: (value: number) => void;
    onDiscount: (value: boolean) => void;
  }) {
    return (
      <div className="demo-form">
        <span className="demo-eyebrow">{t('Workshop tickets · $25 each')}</span>
        <label>
          {t('Quantity')}
          <input
            aria-label={t('Quantity')}
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(e) => onQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="demo-checkbox">
          <input
            type="checkbox"
            checked={discount}
            onChange={(e) => onDiscount(e.target.checked)}
          />
          {t('Member discount · 20%')}
        </label>
        <div className="demo-total">
          <span>{t('Total')}</span>
          <output aria-live="polite">${total.toFixed(2)}</output>
        </div>
      </div>
    );
  }
  return holo({
    core: CartView,
    state: { quantity: $quantity, discount: $discount, total: $total },
    actions: { onQuantity: $quantity, onDiscount: $discount },
  });
}
// #endregion ion

// #region prism
function createPrismDemo(t: DocsTranslator) {
  const $user = stateAtom({ name: 'Ada Lovelace', role: 'Editor' });
  const { $name, $role } = prism($user, { $name: (user) => user.name, $role: (user) => user.role });
  const rename = actionAtom((_get, set, name: string) => set($user, (user) => ({ ...user, name })));
  const changeRole = actionAtom((_get, set, role: string) =>
    set($user, (user) => ({ ...user, role })),
  );
  const Name = holo({
    core: ({ name, onName }: { name: string; onName: (name: string) => void }) => (
      <label>
        {t('Name projection')}
        <input value={name} onChange={(e) => onName(e.target.value)} />
      </label>
    ),
    state: { name: $name },
    actions: { onName: rename },
  });
  const Role = holo({
    core: ({ role, onRole }: { role: string; onRole: (role: string) => void }) => (
      <label>
        {t('Role projection')}
        <select value={role} onChange={(e) => onRole(e.target.value)}>
          <option value="Editor">{t('Editor')}</option>
          <option value="Viewer">{t('Viewer')}</option>
          <option value="Admin">{t('Admin')}</option>
        </select>
      </label>
    ),
    state: { role: $role },
    actions: { onRole: changeRole },
  });
  return function ProfileProjections() {
    return (
      <div className="demo-form">
        <span className="demo-eyebrow">{t('One source → two independent atoms')}</span>
        <Name />
        <Role />
        <p className="demo-note">{t('Changing the role keeps the selected name unchanged.')}</p>
      </div>
    );
  };
}
// #endregion prism

// #region event
function createEventDemo(t: DocsTranslator) {
  const messageReceived = eventAtom<{ text: string }>();
  const $last = stateAtom('');
  const $deliveries = stateAtom(0);
  const record = actionAtom((_get, set, text: string) => {
    set($last, text);
    set($deliveries, (count) => count + 1);
  });
  function View({
    last,
    deliveries,
    onReceive,
  }: {
    last: string;
    deliveries: number;
    onReceive: (payload: { text: string }) => void;
  }) {
    const [listening, setListening] = useState(true);
    const store = useStore();
    useEffect(() => {
      if (!listening) return;
      return subscribeEvent(store, messageReceived, ({ text }) => store.set(record, text));
    }, [store, listening]);
    return (
      <div className="demo-form">
        <span className="demo-eyebrow">{t('Simulated incoming message')}</span>
        <p>{t('The same payload is delivered on every occurrence.')}</p>
        <div className="demo-controls">
          <button type="button" onClick={() => onReceive({ text: t('Hello, Jotai!') })}>
            {t('Receive message')}
          </button>
          <button type="button" onClick={() => setListening((value) => !value)}>
            {listening ? t('Unsubscribe') : t('Subscribe')}
          </button>
        </div>
        <output aria-live="polite">
          {t('Deliveries')}: {deliveries} · {last || '—'}
        </output>
      </div>
    );
  }
  return holo({
    core: View,
    state: { last: $last, deliveries: $deliveries },
    actions: { onReceive: messageReceived },
  });
}
// #endregion event

// #region bond
function createBondDemo(t: DocsTranslator) {
  const orderSubmitted = eventAtom<{ number: number }>();
  const $number = stateAtom(100);
  const $enabled = stateAtom(true);
  const $receipt = stateAtom('');
  const submit = actionAtom((get, set) => {
    const number = get($number);
    set($number, number + 1); // Local demo checkout completes here.
    set(orderSubmitted, { number });
  });
  const receipt = bond({
    state: { prefix: stateAtom(t('Receipt for order')) },
    trigger: orderSubmitted,
    guard: $enabled,
    map: ({ prefix }, order) => [`${prefix} #${order.number}`],
    yield: $receipt,
  });
  const Checkout = holo({
    core: ({
      enabled,
      message,
      onEnabled,
      onSubmit,
    }: {
      enabled: boolean;
      message: string;
      onEnabled: (value: boolean) => void;
      onSubmit: () => void;
    }) => (
      <div className="demo-form">
        <span className="demo-eyebrow">{t('A fact → a separate reaction')}</span>
        <label className="demo-checkbox">
          <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
          {t('Generate receipt')}
        </label>
        <button type="button" onClick={() => onSubmit()}>
          {t('Submit demo order')}
        </button>
        <output aria-live="polite">{message || t('No receipts yet')}</output>
        <p className="demo-note">{t('Local simulation: no payment or network request.')}</p>
      </div>
    ),
    state: { enabled: $enabled, message: $receipt },
    actions: { onEnabled: $enabled, onSubmit: submit },
  });
  return function OwnedCheckout() {
    const store = useStore();
    useEffect(() => receipt.connect(store), [store]);
    return <Checkout />;
  };
}
// #endregion bond

// #region cage
function createCageDemo(t: DocsTranslator) {
  const $query = stateAtom('');
  const $mounted = stateAtom(false);
  const changed = actionAtom((_get, set, query: string) => set($query, query));
  const Search = holo({
    core: ({ term }: { term: string }) => (
      <p className="demo-note">
        {t('Mounted search View receives')}: {term || '—'}
      </p>
    ),
    cage: {
      onMount(_get, set) {
        set($mounted, true);
      },
      onChange(_get, set, ctx) {
        set(changed, ctx.props.term);
      },
      onUnmount(_get, set) {
        set($mounted, false);
        set(changed, '');
      },
    },
  });
  const Status = holo({
    core: ({ query, mounted }: { query: string; mounted: boolean }) => (
      <output aria-live="polite">
        {mounted ? t('mounted') : t('unmounted')} · $query: {query || '∅'}
      </output>
    ),
    state: { query: $query, mounted: $mounted },
  });
  return function LifecycleDemo() {
    const [term, setTerm] = useState('jotai');
    const [visible, setVisible] = useState(true);
    return (
      <div className="demo-form">
        <label>
          {t('Input prop: term')}
          <input value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
        <label className="demo-checkbox">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          {t('Mount Search')}
        </label>
        {visible && <Search term={term} />}
        <Status />
      </div>
    );
  };
}
// #endregion cage

// #region list
function createListDemo(t: DocsTranslator) {
  type Task = { id: number; text: string };
  const $tasks = stateAtom<readonly Task[]>([
    { id: 1, text: t('Review proposal') },
    { id: 2, text: t('Ship documentation') },
  ]);
  const reverse = actionAtom((_get, set) => set($tasks, (items) => [...items].reverse()));
  const reset = actionAtom((_get, set) => set($tasks, []));
  function TaskView({ task }: { task: Task }) {
    const [done, setDone] = useState(false);
    return (
      <li>
        <label className="demo-checkbox">
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
          <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{task.text}</span>
          <code>#{task.id}</code>
        </label>
      </li>
    );
  }
  const Tasks = holoList({
    source: $tasks,
    core: TaskView,
    getKey: (task) => task.id,
    mapItem: (task) => ({ task }),
    empty: () => <li className="demo-note">{t('All clear.')}</li>,
  });
  const Controls = holo({
    core: ({ onReverse, onClear }: { onReverse: () => void; onClear: () => void }) => (
      <div className="demo-controls">
        <button type="button" onClick={() => onReverse()}>
          {t('Reverse rows')}
        </button>
        <button type="button" onClick={() => onClear()}>
          {t('Clear')}
        </button>
      </div>
    ),
    actions: { onReverse: reverse, onClear: reset },
  });
  return function ListDemo() {
    return (
      <div className="demo-form">
        <span className="demo-eyebrow">{t('Stable keys preserve row state')}</span>
        <ul className="demo-task-list">
          <Tasks />
        </ul>
        <Controls />
        <p className="demo-note">{t('Check a task, then reverse the rows.')}</p>
      </div>
    );
  };
}
// #endregion list

// #region match
function createMatchDemo(t: DocsTranslator) {
  type Status = 'loading' | 'ready' | 'error';
  const $status = stateAtom<Status>('ready');
  const labels = { loading: t('Loading'), ready: t('Ready'), error: t('Error') };
  const Content = holoMatch({
    source: $status,
    cases: {
      loading: () => <div className="demo-branch">◌ {t('Loading your workspace…')}</div>,
      ready: () => <div className="demo-branch">✓ {t('Your workspace is ready.')}</div>,
      error: () => (
        <div className="demo-branch" role="alert">
          ! {t('Could not load. Try again.')}
        </div>
      ),
    },
  });
  const Controls = holo({
    core: ({ status, onStatus }: { status: Status; onStatus: (value: Status) => void }) => (
      <div className="demo-controls">
        {(['loading', 'ready', 'error'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => onStatus(value)}
          >
            {labels[value]}
          </button>
        ))}
      </div>
    ),
    state: { status: $status },
    actions: { onStatus: $status },
  });
  return function MatchDemo() {
    return (
      <div className="demo-form">
        <Controls />
        <Content />
      </div>
    );
  };
}
// #endregion match

export function createDocumentationDemo(kind: string, t: DocsTranslator): ComponentType {
  const factories: Record<string, (t: DocsTranslator) => ComponentType> = {
    counter: createCounterDemo,
    ion: createIonDemo,
    prism: createPrismDemo,
    event: createEventDemo,
    bond: createBondDemo,
    cage: createCageDemo,
    list: createListDemo,
    match: createMatchDemo,
  };
  const factory = factories[kind];
  if (!factory) throw new Error(`Unknown documentation demo: ${kind}`);
  const Demo = factory(t);
  const store = createStore();
  return function IsolatedDemo() {
    return (
      <Provider store={store}>
        <Demo />
      </Provider>
    );
  };
}

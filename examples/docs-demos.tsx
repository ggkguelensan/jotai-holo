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
const wording = (ru: boolean, en: string, translated: string) => (ru ? translated : en);

// #region counter
function createCounterDemo(ru: boolean) {
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
          {wording(ru, 'Derived × 2', 'Производное × 2')}: <strong>{doubled}</strong>
        </p>
        <div className="demo-controls">
          <button
            type="button"
            onClick={() => onIncrement(-1)}
            aria-label={wording(ru, 'Decrement', 'Уменьшить')}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onIncrement(1)}
            aria-label={wording(ru, 'Increment', 'Увеличить')}
          >
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
    bindProps: { title: wording(ru, 'One model, ordinary props', 'Одна модель, обычные пропсы') },
  });
}
// #endregion counter

// #region ion
function createIonDemo(ru: boolean) {
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
        <span className="demo-eyebrow">
          {wording(ru, 'Workshop tickets · $25 each', 'Билеты на воркшоп · $25 каждый')}
        </span>
        <label>
          {wording(ru, 'Quantity', 'Количество')}
          <input
            aria-label={wording(ru, 'Quantity', 'Количество')}
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
          {wording(ru, 'Member discount · 20%', 'Скидка участника · 20%')}
        </label>
        <div className="demo-total">
          <span>{wording(ru, 'Total', 'Итого')}</span>
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
function createPrismDemo(ru: boolean) {
  const $user = stateAtom({ name: 'Ada Lovelace', role: 'Editor' });
  const { $name, $role } = prism($user, { $name: (user) => user.name, $role: (user) => user.role });
  const rename = actionAtom((_get, set, name: string) => set($user, (user) => ({ ...user, name })));
  const changeRole = actionAtom((_get, set, role: string) =>
    set($user, (user) => ({ ...user, role })),
  );
  const Name = holo({
    core: ({ name, onName }: { name: string; onName: (name: string) => void }) => (
      <label>
        {wording(ru, 'Name projection', 'Проекция имени')}
        <input value={name} onChange={(e) => onName(e.target.value)} />
      </label>
    ),
    state: { name: $name },
    actions: { onName: rename },
  });
  const Role = holo({
    core: ({ role, onRole }: { role: string; onRole: (role: string) => void }) => (
      <label>
        {wording(ru, 'Role projection', 'Проекция роли')}
        <select value={role} onChange={(e) => onRole(e.target.value)}>
          <option>Editor</option>
          <option>Viewer</option>
          <option>Admin</option>
        </select>
      </label>
    ),
    state: { role: $role },
    actions: { onRole: changeRole },
  });
  return function ProfileProjections() {
    return (
      <div className="demo-form">
        <span className="demo-eyebrow">
          {wording(
            ru,
            'One source → two independent atoms',
            'Один источник → два независимых атома',
          )}
        </span>
        <Name />
        <Role />
        <p className="demo-note">
          {wording(
            ru,
            'Changing the role keeps the selected name unchanged.',
            'Смена роли не меняет выбранное значение имени.',
          )}
        </p>
      </div>
    );
  };
}
// #endregion prism

// #region event
function createEventDemo(ru: boolean) {
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
        <span className="demo-eyebrow">
          {wording(ru, 'Simulated incoming message', 'Имитация входящего сообщения')}
        </span>
        <p>
          {wording(
            ru,
            'The same payload is delivered on every occurrence.',
            'Один и тот же payload доставляется при каждом срабатывании.',
          )}
        </p>
        <div className="demo-controls">
          <button type="button" onClick={() => onReceive({ text: 'Hello, Jotai!' })}>
            {wording(ru, 'Receive message', 'Получить сообщение')}
          </button>
          <button type="button" onClick={() => setListening((value) => !value)}>
            {listening
              ? wording(ru, 'Unsubscribe', 'Отписаться')
              : wording(ru, 'Subscribe', 'Подписаться')}
          </button>
        </div>
        <output aria-live="polite">
          {wording(ru, 'Deliveries', 'Доставлено')}: {deliveries} · {last || '—'}
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
function createBondDemo(ru: boolean) {
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
    state: { prefix: stateAtom(wording(ru, 'Receipt for order', 'Чек для заказа')) },
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
        <span className="demo-eyebrow">
          {wording(ru, 'A fact → a separate reaction', 'Факт → независимая реакция')}
        </span>
        <label className="demo-checkbox">
          <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
          {wording(ru, 'Generate receipt', 'Создавать чек')}
        </label>
        <button type="button" onClick={() => onSubmit()}>
          {wording(ru, 'Submit demo order', 'Оформить демо-заказ')}
        </button>
        <output aria-live="polite">
          {message || wording(ru, 'No receipts yet', 'Чеков пока нет')}
        </output>
        <p className="demo-note">
          {wording(
            ru,
            'Local simulation: no payment or network request.',
            'Локальная имитация: без оплаты и сетевых запросов.',
          )}
        </p>
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
function createCageDemo(ru: boolean) {
  const $query = stateAtom('');
  const $mounted = stateAtom(false);
  const changed = actionAtom((_get, set, query: string) => set($query, query));
  const Search = holo({
    core: ({ term }: { term: string }) => (
      <p className="demo-note">
        {wording(ru, 'Mounted search View receives', 'Смонтированный Search View получает')}:{' '}
        {term || '—'}
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
        {mounted ? 'mounted' : 'unmounted'} · $query: {query || '∅'}
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
          {wording(ru, 'Input prop: term', 'Входной пропс: term')}
          <input value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
        <label className="demo-checkbox">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          {wording(ru, 'Mount Search', 'Монтировать Search')}
        </label>
        {visible && <Search term={term} />}
        <Status />
      </div>
    );
  };
}
// #endregion cage

// #region list
function createListDemo(ru: boolean) {
  type Task = { id: number; text: string };
  const $tasks = stateAtom<readonly Task[]>([
    { id: 1, text: 'Review proposal' },
    { id: 2, text: 'Ship documentation' },
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
    empty: () => <li className="demo-note">{wording(ru, 'All clear.', 'Список пуст.')}</li>,
  });
  const Controls = holo({
    core: ({ onReverse, onClear }: { onReverse: () => void; onClear: () => void }) => (
      <div className="demo-controls">
        <button type="button" onClick={() => onReverse()}>
          {wording(ru, 'Reverse rows', 'Развернуть список')}
        </button>
        <button type="button" onClick={() => onClear()}>
          {wording(ru, 'Clear', 'Очистить')}
        </button>
      </div>
    ),
    actions: { onReverse: reverse, onClear: reset },
  });
  return function ListDemo() {
    return (
      <div className="demo-form">
        <span className="demo-eyebrow">
          {wording(
            ru,
            'Stable keys preserve row state',
            'Стабильные ключи сохраняют состояние строки',
          )}
        </span>
        <ul className="demo-task-list">
          <Tasks />
        </ul>
        <Controls />
        <p className="demo-note">
          {wording(
            ru,
            'Check a task, then reverse the rows.',
            'Отметьте задачу, затем разверните список.',
          )}
        </p>
      </div>
    );
  };
}
// #endregion list

// #region match
function createMatchDemo(ru: boolean) {
  type Status = 'loading' | 'ready' | 'error';
  const $status = stateAtom<Status>('ready');
  const Content = holoMatch({
    source: $status,
    cases: {
      loading: () => (
        <div className="demo-branch">
          ◌ {wording(ru, 'Loading your workspace…', 'Загрузка пространства…')}
        </div>
      ),
      ready: () => (
        <div className="demo-branch">
          ✓ {wording(ru, 'Your workspace is ready.', 'Пространство готово.')}
        </div>
      ),
      error: () => (
        <div className="demo-branch" role="alert">
          ! {wording(ru, 'Could not load. Try again.', 'Не удалось загрузить. Попробуйте ещё раз.')}
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
            {value}
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

export function createDocumentationDemo(kind: string, ru: boolean): ComponentType {
  const factories: Record<string, (ru: boolean) => ComponentType> = {
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
  const Demo = factory(ru);
  const store = createStore();
  return function IsolatedDemo() {
    return (
      <Provider store={store}>
        <Demo />
      </Provider>
    );
  };
}

import { createStore, Provider } from 'jotai';
import { atom } from 'jotai/vanilla';
import { useId, type ComponentType } from 'react';
import { actionAtom, and, eq, holo, or, some, stateAtom, sum } from 'jotai-holo';
import { createModel } from 'jotai-holo/model';
import { queryAtoms, queryClientAtom } from 'jotai-holo/query';
import { createFormModel, formAtom, holoForm } from 'jotai-holo/rhf';
import { QueryClient, queryOptions } from '@tanstack/react-query';
import { Controller, useFormContext, useFormState, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const text = (ru: boolean, en: string, translated: string) => (ru ? translated : en);

// #region operators
export function createOperatorsDemo(ru: boolean) {
  const $goods = stateAtom(80);
  const $delivery = stateAtom(15);
  const $deliveryMethod = stateAtom('courier');
  const $accepted = stateAtom(false);
  const $total = sum({ goods: $goods, delivery: $delivery });
  const $isCourier = eq($deliveryMethod, 'courier');
  const $hasDelivery = or([$isCourier, eq($deliveryMethod, 'pickup')]);
  const $canOrder = and([$hasDelivery, $accepted]);
  const $hasSurcharge = some([$goods, $delivery], (amount) => amount > 100);
  return holo({
    core: ({
      total,
      accepted,
      canOrder,
      surcharge,
      onAccept,
    }: {
      total: number;
      accepted: boolean;
      canOrder: boolean;
      surcharge: boolean;
      onAccept: (value: boolean) => void;
    }) => (
      <div className="demo-form">
        <span className="demo-eyebrow">
          {text(ru, 'Order review · courier delivery', 'Проверка заказа · доставка курьером')}
        </span>
        <p>{text(ru, 'Goods $80 + delivery $15', 'Товары $80 + доставка $15')}</p>
        <output className="demo-number">${total}</output>
        <label>
          <input type="checkbox" checked={accepted} onChange={(e) => onAccept(e.target.checked)} />{' '}
          {text(ru, 'I accept the delivery terms', 'Я принимаю условия доставки')}
        </label>
        <small>
          {surcharge
            ? text(ru, 'Surcharge applies', 'Есть доплата')
            : text(ru, 'No surcharge', 'Без доплаты')}
        </small>
        <button disabled={!canOrder}>{text(ru, 'Place order', 'Оформить заказ')}</button>
      </div>
    ),
    state: { total: $total, accepted: $accepted, canOrder: $canOrder, surcharge: $hasSurcharge },
    actions: { onAccept: $accepted },
  });
}
// #endregion operators

// #region model
export function createModelDemo(ru: boolean) {
  const Proposal = createModel({
    create: () => {
      const $seats = stateAtom(5);
      const addSeat = actionAtom((_get, set) => set($seats, (n) => n + 1));
      return { $seats, addSeat };
    },
  });
  // Both bindings select the same instance without a scope provider.
  const Seats = holo({
    model: (props: { proposalId: string }) =>
      Proposal({ key: ['proposal', { id: props.proposalId }] }),
    core: ({ count }: { count: number }) => <output className="demo-number">{count}</output>,
    state: (m) => ({ count: m.$seats }),
  });
  const Toolbar = holo({
    model: (props: { proposalId: string }) =>
      Proposal({ key: ['proposal', { id: props.proposalId }] }),
    core: ({ onAdd }: { onAdd: () => void }) => (
      <button onClick={onAdd}>{text(ru, 'Add a seat', 'Добавить место')}</button>
    ),
    actions: (m) => ({ onAdd: m.addSeat }),
  });
  return function ProposalDemo() {
    return (
      <div className="demo-form">
        {['Atlas', 'Beacon'].map((id) => (
          <section key={id}>
            <span className="demo-eyebrow">
              {text(ru, 'Proposal', 'Предложение')} {id}
            </span>
            <Seats proposalId={id} />
            <Toolbar proposalId={id} />
          </section>
        ))}
      </div>
    );
  };
}
// #endregion model

// #region query
export function createQueryDemo(ru: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const $productId = stateAtom('desk');
  // Resource factory: consumers keep the options intact and never reconstruct its query key.
  const productDetailQO = ({ productId }: { productId: string }) =>
    queryOptions({
      queryKey: ['products', 'detail', { productId }] as const,
      queryFn: async ({ signal }) => {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 250);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(signal.reason);
            },
            { once: true },
          );
        });
        return {
          name:
            productId === 'desk'
              ? text(ru, 'Oak desk', 'Дубовый стол')
              : text(ru, 'Desk lamp', 'Настольная лампа'),
          price: productId === 'desk' ? 240 : 45,
        };
      },
    });
  const product = queryAtoms({
    state: { productId: $productId },
    query: productDetailQO,
    client,
    prism: {
      $product: (result) => result.data,
      $pending: (result) => result.isPending,
      $refreshing: (result) => result.isFetching && !result.isPending,
      $error: (result) => result.error,
    },
  });
  const Card = holo({
    core: ({
      data,
      pending,
      error,
    }: {
      data: { name: string; price: number } | undefined;
      pending: boolean;
      error: Error | null;
    }) => (
      <section>
        <span className="demo-eyebrow">{text(ru, 'Product catalog', 'Каталог товаров')}</span>
        <p role="status">
          {pending
            ? text(ru, 'Loading…', 'Загрузка…')
            : error
              ? error.message
              : `${data?.name} · $${data?.price}`}
        </p>
      </section>
    ),
    state: { data: product.$product, pending: product.$pending, error: product.$error },
  });
  const Switch = holo({
    core: ({ onChange }: { onChange: (value: string) => void }) => (
      <div className="demo-controls">
        <button onClick={() => onChange('desk')}>{text(ru, 'Desk', 'Стол')}</button>
        <button onClick={() => onChange('lamp')}>{text(ru, 'Lamp', 'Лампа')}</button>
      </div>
    ),
    actions: { onChange: $productId },
  });
  return function CatalogDemo() {
    return (
      <div className="demo-form">
        <Card />
        <Switch />
      </div>
    );
  };
}
// #endregion query

// #region form
export function createFormDemo(ru: boolean) {
  const schema = z.object({
    email: z.email(text(ru, 'Enter a valid email', 'Введите корректный email')),
    channel: z.enum(['email', 'phone']),
  });
  type Values = z.infer<typeof schema>;
  const Contact = createFormModel({
    initial: { email: '', channel: 'email' as const },
    options: (initial) => ({ defaultValues: initial, resolver: zodResolver(schema) }),
    model: ({ form }) => {
      const $saved = stateAtom('');
      return {
        $email: formAtom(form, 'email'),
        $control: atom(form.control),
        $saved,
        save: actionAtom((_get, set) =>
          form.handleSubmit((values) => {
            set($saved, values.email);
          })(),
        ),
      };
    },
  });
  function ContactView({ onSave }: { onSave: () => Promise<void> }) {
    const errorId = useId();
    const { register, control } = useFormContext<Values>();
    const { errors } = useFormState({ control });
    return (
      <form
        className="demo-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? errorId : undefined}
            {...register('email')}
          />
        </label>
        {errors.email && (
          <small id={errorId} role="alert">
            {errors.email.message}
          </small>
        )}
        <Controller
          name="channel"
          control={control}
          render={({ field }) => (
            <label>
              {text(ru, 'Contact channel', 'Канал связи')}
              <select {...field}>
                <option value="email">Email</option>
                <option value="phone">{text(ru, 'Phone', 'Телефон')}</option>
              </select>
            </label>
          )}
        />
      </form>
    );
  }
  const Editor = holoForm({
    model: (props: { contactId: string }) => Contact({ key: [props.contactId] }),
    core: ContactView,
    actions: (m) => ({ onSave: m.save }),
  });
  function SaveView({
    email,
    saved,
    control,
    onSave,
  }: {
    email: string;
    saved: string;
    control: Control<Values>;
    onSave: () => Promise<void>;
  }) {
    const { isSubmitting } = useFormState({ control });
    return (
      <aside className="demo-form demo-save-panel">
        <span className="demo-eyebrow">
          {text(ru, 'External save panel', 'Внешняя панель сохранения')}
        </span>
        <small>{email || text(ru, 'No email yet', 'Email пока не указан')}</small>
        <button disabled={isSubmitting} onClick={() => void onSave()}>
          {text(ru, 'Save contact', 'Сохранить контакт')}
        </button>
        {saved && (
          <output>
            {text(ru, 'Saved:', 'Сохранено:')} {saved}
          </output>
        )}
      </aside>
    );
  }
  const SavePanel = holo({
    model: (props: { contactId: string }) => Contact({ key: [props.contactId] }),
    core: SaveView,
    state: (m) => ({ email: m.$email, saved: m.$saved, control: m.$control }),
    actions: (m) => ({ onSave: m.save }),
  });
  return function ContactsDemo() {
    return (
      <div className="demo-instances">
        {['Ada', 'Grace'].map((id) => (
          <section key={id} className="demo-contact-card">
            <header>
              <strong>{id}</strong>
              <span className="demo-eyebrow">
                {text(ru, 'Contact preferences', 'Настройки контакта')}
              </span>
            </header>
            <Editor contactId={id} />
            <SavePanel contactId={id} />
          </section>
        ))}
      </div>
    );
  };
}
// #endregion form

export function createInfrastructureDemo(kind: string, ru: boolean): ComponentType {
  const factories = {
    operators: createOperatorsDemo,
    model: createModelDemo,
    query: createQueryDemo,
    form: createFormDemo,
  };
  const Demo = factories[kind as keyof typeof factories](ru);
  const store = createStore();
  return function IsolatedDemo() {
    return (
      <Provider store={store}>
        <Demo />
      </Provider>
    );
  };
}

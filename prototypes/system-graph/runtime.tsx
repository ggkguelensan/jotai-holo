import { createStore, Provider } from 'jotai';
import { QueryClient, queryOptions, mutationOptions } from '@tanstack/react-query';
import { observe } from 'jotai-effect';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { pipe, modelConnection, modelRegistry } from 'jotai-holo/model';
import { createQueryModel, createMutationModel, queryClientAtom } from 'jotai-holo/query';
import { createFormModel, formAtom, holoForm } from 'jotai-holo/rhf';
import { createAnalytics, modelAnalytics, type AnalyticsAdapter } from 'jotai-holo/analytics';
import { createGiftModel, type Receipt } from './business';
import { BuyView, CopiesView, EmailView, ReceiptView, SummaryView } from './views';

export type Message = { name: string; properties: Record<string, unknown> };
export type Log = Message & { engine: string; id: number };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Each prototype gets its own store, QueryClient and adapter log.
export function createScenario() {
  const store = createStore();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  store.set(queryClientAtom, client);
  const $logs = stateAtom<Log[]>([]);
  const $analyticsReady = stateAtom(false);
  const $failure = stateAtom('');
  let sequence = 0;
  let alive = true;

  // Local transport simulation. No purchase or external request is made.
  const $$gameQuery = createQueryModel({
    query: () =>
      queryOptions({
        queryKey: ['game', 'starfall'],
        queryFn: async () => {
          await wait(350);
          return { id: 'starfall', name: 'Starfall', price: 25 };
        },
        staleTime: Infinity,
      }),
    prism: { $game: (result) => result.data },
  });

  const $$purchaseMutation = createMutationModel({
    mutation: () =>
      mutationOptions({
        mutationFn: async (input: Omit<Receipt, 'orderId'>): Promise<Receipt> => {
          await wait(550);
          return { ...input, orderId: `GIFT-${++sequence + 1000}` };
        },
      }),
    prism: { $pending: (result) => result.isPending },
  });

  const $$giftForm = pipe(
    createFormModel({
      initial: { email: 'alex@example.com' },
      options: (initial) => ({ defaultValues: initial }),
      model: ({ form }) => ({ $email: formAtom(form, 'email') }),
    }),
    modelRegistry(),
  );
  const formSelection = $$giftForm({ key: ['gift', 'starfall'] });

  const $$gift = pipe(
    createGiftModel,
    modelConnection(($$gift, { store }) =>
      observe((get, set) => {
        const game = get($$gameQuery.$game);
        if (game) set($$gift.receive, game);
      }, store),
    ),
    modelRegistry(),
  );
  const selection = $$gift({ key: ['gift', 'starfall'] });

  const buy = actionAtom(async (get, set) => {
    if (get($$purchaseMutation.$pending)) return;
    const gift = get(selection);
    const game = get(gift.$game);
    const email = get(get(formSelection).$email).trim();
    if (!game || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      set($failure, 'Укажи email получателя.');
      return;
    }
    set($failure, '');
    try {
      const receipt = await set($$purchaseMutation.mutate, {
        game: game.name,
        email,
        total: get(gift.$total),
      });
      if (alive) set(gift.complete, receipt);
    } catch (error) {
      set($failure, error instanceof Error ? error.message : 'Не удалось купить');
    }
  });

  const adapter = (engine: string): AnalyticsAdapter<Message> => ({
    send(message) {
      if (alive)
        store.set($logs, (logs) =>
          [
            ...logs,
            {
              ...message,
              engine,
              id: logs.length + 1,
            },
          ].slice(-12),
        );
    },
  });
  const analytics = createAnalytics({
    engines: { amplitude: () => adapter('Amplitude'), warehouse: () => adapter('Warehouse') },
    onError: ({ error }) => {
      if (alive) store.set($failure, String(error));
    },
  });

  const $$trackedGift = pipe(
    $$gift,
    modelAnalytics(async () => {
      // Deliberate demo latency makes the import boundary visible.
      await wait(600);
      const { createGiftAnalyticsModel } = await import('./analytics');
      if (alive) store.set($analyticsReady, true);
      return (gift) => createGiftAnalyticsModel(gift, analytics);
    }),
  );

  const models = { gift: () => selection };
  const Summary = holo({
    models,
    view: SummaryView,
    read: ({ gift }) => ({ game: gift.$game, total: gift.$total }),
  });
  const Copies = holo({
    models,
    view: CopiesView,
    read: ({ gift }) => ({ copies: gift.$copies }),
    write: ({ gift }) => ({ onChange: gift.$copies }),
  });
  const Email = holoForm({
    models: { form: () => formSelection },
    form: ({ form }) => form.form,
    view: EmailView,
  });
  const Buy = holo({
    view: BuyView,
    read: { pending: $$purchaseMutation.$pending, error: $failure, game: $$gameQuery.$game },
    write: { onBuy: buy },
  });
  const Receipt = holo({
    models,
    view: ReceiptView,
    read: ({ gift }) => ({ receipt: gift.$receipt }),
  });
  const AnalyticsOwner = holo({
    models: { gift: () => $$trackedGift({ key: ['gift', 'starfall'] }) },
    view: () => null,
  });
  function Controls() {
    return (
      <>
        <Copies />
        <Buy />
      </>
    );
  }
  function Checkout() {
    return (
      <div className="checkout">
        <Summary />
        <Email />
        <Copies />
        <Buy />
        <Receipt />
      </div>
    );
  }
  function Scope({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  return {
    store,
    selection,
    formSelection,
    $$gameQuery,
    $$purchaseMutation,
    $logs,
    $analyticsReady,
    buy,
    Checkout,
    Controls,
    AnalyticsOwner,
    Scope,
    dispose() {
      alive = false;
      client.clear();
      void analytics.dispose(store);
    },
  };
}
export type Scenario = ReturnType<typeof createScenario>;
export type Analytics = ReturnType<
  typeof createAnalytics<{
    amplitude: () => AnalyticsAdapter<Message>;
    warehouse: () => AnalyticsAdapter<Message>;
  }>
>;

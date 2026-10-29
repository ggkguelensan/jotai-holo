import { useLingui } from '@lingui/react/macro';
import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
import { QueryClient } from '@tanstack/react-query';
import { holo, holoMatch, stateAtom } from 'jotai-holo';
import { createQueryModel } from 'jotai-holo/query';
import { queryOptions } from '@tanstack/react-query';

// #region query
const $gameId = stateAtom('starfall');
// Resource factory: consumers keep the options intact
// and never reconstruct its query key.
export const gameDetailQO = ({ gameId }: { gameId: string }) =>
  queryOptions({
    queryKey: ['games', 'detail', { gameId }] as const,
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
      if (gameId !== 'starfall' && gameId !== 'moon-harbor') return null;
      return {
        id: gameId,
        name: gameId === 'starfall' ? 'Starfall' : 'Moon Harbor',
        price: gameId === 'starfall' ? 25 : 15,
      };
    },
  });

export const $$gameQuery = createQueryModel({
  state: { gameId: $gameId },
  query: gameDetailQO,
  prism: {
    $game: (result) => result.data,
    $screen: (result): 'loading' | 'error' | 'empty' | 'ready' => {
      if (result.isPending) return 'loading';
      if (result.isError) return 'error';
      if (result.data == null) return 'empty';
      return 'ready';
    },
    $refreshing: (result) => result.isFetching && !result.isPending,
    $error: (result) => result.error,
  },
});

type Game = { id: string; name: string; price: number };

function CardView({ data }: { data: Game | null | undefined }) {
  const { t } = useLingui();
  // A separate screen atom does not narrow this atom's TypeScript type.
  if (!data) return null;
  const name = data.id === 'starfall' ? t`Starfall` : t`Moon Harbor`;

  return <p role="status">{`${name} · $${data.price}`}</p>;
}

function LoadingView() {
  const { t } = useLingui();

  return <p role="status">{t`Loading…`}</p>;
}

function EmptyView() {
  const { t } = useLingui();

  return <p role="status">{t`Game not found.`}</p>;
}

function ErrorView({ error }: { error: Error | null }) {
  const { t } = useLingui();

  return <p role="alert">{error?.message ?? t`Could not load. Try again.`}</p>;
}

const Card = holo({
  view: CardView,
  read: { data: $$gameQuery.$game },
});

const GameError = holo({
  view: ErrorView,
  read: { error: $$gameQuery.$error },
});

const GameContent = holoMatch({
  source: $$gameQuery.$screen,
  cases: {
    loading: LoadingView,
    error: GameError,
    empty: EmptyView,
    ready: Card,
  },
});

function CatalogView() {
  const { t } = useLingui();

  return (
    <section>
      <span className="demo-eyebrow">{t`Game catalog`}</span>
      <GameContent />
    </section>
  );
}

function SwitchView({ onChange }: { onChange: (value: string) => void }) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button onClick={() => onChange('starfall')}>{t`Starfall`}</button>
      <button onClick={() => onChange('moon-harbor')}>{t`Moon Harbor`}</button>
    </div>
  );
}

const Switch = holo({
  view: SwitchView,
  write: { onChange: $gameId },
});

function CatalogDemo() {
  return (
    <div className="demo-form">
      <CatalogView />
      <Switch />
    </div>
  );
}
// #endregion query

export default CatalogDemo;

// Preview setup: each mounted example injects its own QueryClient.
export function setup(store: ReturnType<typeof createStore>) {
  store.set(
    queryClientAtom,
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    }),
  );
}

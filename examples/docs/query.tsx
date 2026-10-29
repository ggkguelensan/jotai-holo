import { useLingui } from '@lingui/react/macro';
import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
import { QueryClient } from '@tanstack/react-query';
import { holo, holoMatch, stateAtom } from 'jotai-holo';
import { createQueryModel } from 'jotai-holo/query';
import { queryOptions } from '@tanstack/react-query';
import {
  CardView,
  LoadingView,
  EmptyView,
  ErrorView,
  SwitchView,
} from './query-views.js';

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

export type Game = { id: string; name: string; price: number };

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

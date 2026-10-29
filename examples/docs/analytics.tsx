import { useLingui } from '@lingui/react/macro';
import { holo, ion } from 'jotai-holo';
import {
  $deliveries,
  $$recordedSearch as $$search,
} from './analytics-recording.js';
import type { Game } from '../analytics/search-model.js';
import {
  SearchTermView,
  GameRowView,
  CloseGameView,
  ClearLogsView,
  DeliveryListView,
  GameDetailsView,
} from './analytics-views.js';

// #region analytics

const SearchTerm = holo({
  models: { search: $$search },
  view: SearchTermView,
  read: ({ search: $$search }) => ({ query: $$search.$query }),
  write: ({ search: $$search }) => ({ onTermChange: $$search.termChanged }),
});

function SearchFormView({
  onSearch,
}: {
  initialTerm: string;
  onSearch: () => void;
}) {
  const { t } = useLingui();

  return (
    <form
      className="demo-analytics-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <span className="demo-eyebrow">{t`Game catalog`}</span>
      <SearchTerm />
      <button type="submit">{t`Search`}</button>
    </form>
  );
}

const SearchForm = holo({
  models: { search: $$search },
  view: SearchFormView,

  write: ({ search: $$search }) => ({ onSearch: $$search.search }),
  static: { initialTerm: 'starfall' },
  input: ({ search: $$search }) => ({
    initialTerm: $$search.termChanged,
  }),
});

const GameRow = holo({
  models: { search: $$search },
  view: GameRowView,
  write: ({ search: $$search }) => ({ onGameOpen: $$search.openGame }),
});

function GameListView({ games }: { games: readonly Game[] }) {
  return (
    <ul className="demo-analytics-games">
      {games.map((game, position) => (
        <GameRow key={game.id} game={game} position={position} />
      ))}
    </ul>
  );
}

const GameList = holo({
  models: { search: $$search },
  view: GameListView,
  read: ({ search: $$search }) => ({ games: $$search.$games }),
});

const CloseGame = holo({
  models: { search: $$search },
  view: CloseGameView,
  write: ({ search: $$search }) => ({ onClose: $$search.closeGame }),
});

const GameDetails = holo({
  models: { search: $$search },
  view: GameDetailsView,
  static: { children: <CloseGame /> },

  read: ({ search: $$search }) => ({ game: $$search.$selectedGame }),
});

function GameCatalog() {
  return (
    <div className="demo-form demo-analytics-catalog">
      <SearchForm />
      <GameList />
      <GameDetails />
    </div>
  );
}
// #endregion analytics

const $hasDeliveries = ion($deliveries, (deliveries) => deliveries.length > 0);

const ClearLogs = holo({
  view: ClearLogsView,
  read: { enabled: $hasDeliveries },
  write: { onClear: $deliveries },
});

const DeliveryList = holo({
  view: DeliveryListView,
  read: { deliveries: $deliveries },
});

function DeliveryConsole() {
  const { t } = useLingui();
  const summary = t`Actual adapter deliveries · last 50 messages`;

  return (
    <section
      className="demo-analytics-console"
      aria-label={t`Analytics console`}
    >
      <header>
        <strong>{t`Analytics console`}</strong>
        <ClearLogs />
      </header>
      <p className="demo-note">{summary}</p>
      <DeliveryList />
      <footer>{t`Demo adapters only · no SDK or network requests`}</footer>
    </section>
  );
}

export default function AnalyticsDemo() {
  return (
    <div className="demo-analytics">
      <GameCatalog />
      <DeliveryConsole />
    </div>
  );
}

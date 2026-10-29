import { useLingui } from '@lingui/react/macro';
import { holo, ion } from 'jotai-holo';
import {
  $deliveries,
  $$recordedSearch as $$search,
  type Delivery,
} from './analytics-recording.js';
import type { Game } from '../analytics/search-model.js';

// #region analytics
function SearchTermView({
  query,
  onTermChange,
}: {
  query: string;
  onTermChange: (value: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Search games`}
      <input
        value={query}
        onChange={(event) => onTermChange(event.target.value)}
      />
    </label>
  );
}

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

function GameRowView({
  game,
  position,
  onGameOpen,
}: {
  game: Game;
  position: number;
  onGameOpen: (fact: { gameId: string; position: number }) => void;
}) {
  return (
    <li>
      <button onClick={() => onGameOpen({ gameId: game.id, position })}>
        {game.name} · ${game.price}
      </button>
    </li>
  );
}

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

function CloseGameView({ onClose }: { onClose: () => void }) {
  const { t } = useLingui();

  return <button onClick={onClose}>{t`Close details`}</button>;
}

const CloseGame = holo({
  models: { search: $$search },
  view: CloseGameView,
  write: ({ search: $$search }) => ({ onClose: $$search.closeGame }),
});

function GameDetailsView({ game }: { game: Game | null }) {
  const { t } = useLingui();
  if (!game) return null;

  return (
    <article>
      <h3>{t`Game details`}</h3>
      <p>
        {game.name} · ${game.price}
      </p>
      <CloseGame />
    </article>
  );
}

const GameDetails = holo({
  models: { search: $$search },
  view: GameDetailsView,

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

function ClearLogsView({
  enabled,
  onClear,
}: {
  enabled: boolean;
  onClear: (entries: readonly Delivery[]) => void;
}) {
  const { t } = useLingui();

  return (
    <button disabled={!enabled} onClick={() => onClear([])}>
      {t`Clear logs`}
    </button>
  );
}

const ClearLogs = holo({
  view: ClearLogsView,
  read: { enabled: $hasDeliveries },
  write: { onClear: $deliveries },
});

function DeliveryListView({ deliveries }: { deliveries: readonly Delivery[] }) {
  const { t } = useLingui();

  return (
    <>
      <ol aria-live="polite" aria-relevant="additions">
        {[...deliveries].reverse().map(({ id, engine, name, properties }) => (
          <li key={id}>
            <div>
              <span>{engine}</span>
              <code>#{id}</code>
            </div>
            <strong>{name}</strong>
            <pre>{JSON.stringify(properties, null, 2)}</pre>
          </li>
        ))}
      </ol>
      {!deliveries.length && (
        <p className="demo-analytics-empty">
          {t`Search for a game, then open it to see each engine's payload.`}
        </p>
      )}
    </>
  );
}

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

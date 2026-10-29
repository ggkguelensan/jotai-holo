import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { modelAnalytics } from 'jotai-holo/analytics';
import { createSearchModel, type Game } from './search-model.js';

// #region analytics-binding
export const $$search = pipe(
  createSearchModel,

  modelRegistry(),

  modelAnalytics(() =>
    import('./search.analytics.js').then(
      (module) => module.createSearchAnalyticsModel,
    ),
  ),
);
// #endregion analytics-binding

function SearchTermView({
  query,
  onTermChange,
}: {
  query: string;
  onTermChange: (value: string) => void;
}) {
  return (
    <input
      aria-label="Catalog search"
      value={query}
      onChange={(event) => onTermChange(event.target.value)}
    />
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
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <SearchTerm />
      <button type="submit">Search catalog</button>
    </form>
  );
}

export const SearchForm = holo({
  models: { search: $$search },
  view: SearchFormView,
  write: ({ search: $$search }) => ({ onSearch: $$search.search }),
  input: ({ search: $$search }) => ({ initialTerm: $$search.termChanged }),
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
    <ul>
      {games.map((game, position) => (
        <GameRow key={game.id} game={game} position={position} />
      ))}
    </ul>
  );
}

export const GameList = holo({
  models: { search: $$search },
  view: GameListView,
  read: ({ search: $$search }) => ({ games: $$search.$games }),
});

function CloseGameView({ onClose }: { onClose: () => void }) {
  return <button onClick={onClose}>Close details</button>;
}

const CloseGame = holo({
  models: { search: $$search },
  view: CloseGameView,
  write: ({ search: $$search }) => ({ onClose: $$search.closeGame }),
});

function GameDetailsView({ game }: { game: Game | null }) {
  if (!game) return null;
  return (
    <article>
      <h3>{game.name}</h3>
      <p>${game.price}</p>
      <CloseGame />
    </article>
  );
}

export const GameDetails = holo({
  models: { search: $$search },
  view: GameDetailsView,
  read: ({ search: $$search }) => ({ game: $$search.$selectedGame }),
});

export function AnalyticsSearch({ initialTerm }: { initialTerm: string }) {
  return (
    <section>
      <h2>Game search and independent analytics</h2>
      <p>Local catalog; recording adapters, no external SDK or requests.</p>
      <SearchForm initialTerm={initialTerm} />
      <GameList />
      <GameDetails />
    </section>
  );
}

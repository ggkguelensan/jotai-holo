import { actionAtom, eventAtom, stateAtom } from 'jotai-holo/vanilla';

const games = [
  { id: 'starfall', name: 'Starfall', price: 25 },
  { id: 'moon-harbor', name: 'Moon Harbor', price: 15 },
  { id: 'iron-orchard', name: 'Iron Orchard', price: 35 },
];
export type Game = (typeof games)[number];

// #region search-model
export function createSearchModel() {
  const $query = stateAtom('');
  const $category = stateAtom('games');
  const $games = stateAtom<readonly Game[]>([]);
  const $selectedGame = stateAtom<Game | null>(null);

  // #region search-fact
  const searchCompleted = eventAtom<{
    query: string;
    category: string;
    resultCount: number;
    durationMs: number;
  }>();
  // #endregion search-fact

  // #region game-fact
  const gameOpened = eventAtom<{
    gameId: string;
    position: number;
  }>();

  // #endregion game-fact

  const termChanged = actionAtom((_get, set, query: string) => {
    set($query, query);
  });

  // #region search-command
  const search = actionAtom((get, set) => {
    const query = get($query).trim();
    const started = performance.now();
    // Local catalog simulation; a real application emits after API success.
    const found = games.filter((game) =>
      game.name.toLowerCase().includes(query.toLowerCase()),
    );
    set($games, found);
    set(searchCompleted, {
      query,
      category: get($category),
      resultCount: found.length,
      durationMs: performance.now() - started,
    });
  });

  // #endregion search-command

  const openGame = actionAtom(
    (
      get,
      set,
      fact: {
        gameId: string;
        position: number;
      },
    ) => {
      const game = games.find((item) => item.id === fact.gameId);
      if (!game || get($selectedGame)?.id === game.id) return;
      set($selectedGame, game);
      set(gameOpened, fact);
    },
  );

  const closeGame = actionAtom((_get, set) => {
    set($selectedGame, null);
  });

  return {
    $query,
    $category,
    $games,
    $selectedGame,
    termChanged,
    search,
    searchCompleted,
    gameOpened,
    openGame,
    closeGame,
  };
}
export type SearchModel = ReturnType<typeof createSearchModel>;
// #endregion search-model

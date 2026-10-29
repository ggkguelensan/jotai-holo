import { $$analytics } from './application-analytics.js';
import type { SearchModel } from './search-model.js';

// #region search-analytics
export function createSearchAnalyticsModel(
  $$search: SearchModel,
  analytics = $$analytics,
) {
  const searchCompleted = analytics.event({
    trigger: $$search.searchCompleted,

    map: {
      amplitude: (fact) => ({
        name: 'Search completed',
        properties: {
          query: fact.query,
          category: fact.category,
          results: fact.resultCount,
        },
      }),

      warehouse: (fact) => ({
        name: 'search_performance',
        properties: {
          elapsed_seconds: fact.durationMs / 1_000,
          items_found: fact.resultCount,
          outcome: fact.resultCount === 0 ? 'empty' : 'found',
        },
      }),
    },
  });

  const gameOpened = analytics.event({
    trigger: $$search.gameOpened,

    map: {
      posthog: (fact) => ({
        name: 'game_opened',
        properties: {
          game_id: fact.gameId,
          list_position: fact.position + 1,
        },
      }),
    },
  });

  return { searchCompleted, gameOpened };
}
// #endregion search-analytics

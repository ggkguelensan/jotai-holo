import { $$analytics } from './application-analytics.js';
import type { SearchModel } from './search-model.js';

// #region search-analytics
export function createSearchAnalyticsModel(search: SearchModel) {
  const searchCompleted = $$analytics.event({
    trigger: search.searchCompleted,

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

  const productOpened = $$analytics.event({
    trigger: search.productOpened,

    map: {
      posthog: (fact) => ({
        name: 'product_opened',
        properties: {
          product_id: fact.productId,
          list_position: fact.position + 1,
        },
      }),
    },
  });

  return { searchCompleted, productOpened };
}
// #endregion search-analytics

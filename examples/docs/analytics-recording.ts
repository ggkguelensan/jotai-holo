import { stateAtom } from 'jotai-holo';
import { modelAnalytics } from 'jotai-holo/analytics';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import {
  createRecordingAnalytics,
  type AnalyticsMessage,
} from '../analytics/application-analytics.js';
import {
  createSearchModel,
  type SearchModel,
} from '../analytics/search-model.js';

export type Delivery = AnalyticsMessage & { id: number; engine: string };

export const $analyticsLoaded = stateAtom(false);

export const $deliveries = stateAtom<readonly Delivery[]>([]);

// Instrument the actual adapters in this demo's store, without changing facts.
export const $$recordedSearch = pipe(
  createSearchModel,
  modelRegistry(),
  modelConnection(($$search, { store }) => {
    let active = true;
    let sequence = store.get($deliveries).at(-1)?.id ?? 0;
    const analytics = createRecordingAnalytics((engine, message) => {
      store.set($deliveries, (entries) =>
        [...entries, { ...message, engine, id: ++sequence }].slice(-50),
      );
    });
    const observation = modelAnalytics<SearchModel>(async () => {
      const { createSearchAnalyticsModel } = await import(
        '../analytics/search.analytics.js'
      );
      if (active) store.set($analyticsLoaded, true);
      return ($$model) => createSearchAnalyticsModel($$model, analytics);
    })(() => $$search);
    const { release } = observation.acquire(store);

    return () => {
      active = false;
      release();
      store.set($analyticsLoaded, false);
      void analytics.dispose(store);
    };
  }),
);

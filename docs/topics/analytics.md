# Analytics

A completed game search goes to Amplitude and an analytics warehouse. Opening a game goes only to PostHog. The business model publishes facts about what happened; analytics translates each fact for its consumers. Neither the View nor the business factory imports an SDK.

[Open the catalog example](/examples/catalog-analytics). Search for a game and open its details. The console beside the UI shows which engines received each message.

## Publish a complete fact

A search result is a fact after the search succeeds, not when the user clicks Search. Include values that describe that occurrence: query, category, result count and duration. A delayed consumer must not reconstruct them by reading a newer search state.

The demo searches a local catalog. A server-backed model would publish after its request succeeds.

## Map each engine independently {#map-facts-to-engines}

The application declares one shared `createAnalytics` provider. Feature analytics imports that provider and returns managed event declarations:

<GraphExample scene="catalog-analytics">

<<< @/../examples/analytics/search-model.ts#search-fact
<<< @/../examples/analytics/search-model.ts#game-fact
<<< @/../examples/analytics/search.analytics.ts#search-analytics

</GraphExample>

Only the listed engines receive an event. Warehouse names, units and buckets stay in its inline mapper: `durationMs` becomes `elapsed_seconds`, and result count becomes `items_found` plus an outcome bucket. The domain fact keeps its own vocabulary.

The shared provider owns engine factories, error reporting and delivery policy. It can be imported by other feature analytics modules. Its runtime is isolated by Jotai store; an engine loads only when a message needs it.

## Attach observation to the selected model {#connect-analytics-to-a-model}

Application composition chooses the lazy analytics factory:

```ts
const $$search = pipe(
  createSearchModel,
  modelRegistry(),
  modelAnalytics(() =>
    import('./search.analytics').then(
      (module) => module.createSearchAnalyticsModel,
    ),
  ),
);
```

The imported factory receives the selected search record. Its returned event declarations are acquired automatically. The search form, result list and details can each bind this definition through their own `holo`. They share one observation connection per instance and store: adding another View does not duplicate delivery.

The first committed owner starts the load. Releasing one View leaves observation active while others remain; the last release stops it.

## Know what the queue preserves {#loading-and-delivery}

Observation starts after the lazy factory is ready. Facts emitted before that point are not captured. If the first fact is essential, use an eagerly available declaration or prepare analytics before producing it.

Once a fact is mapped, the provider can queue its engine message while the adapter loads. This bounded queue is not an event log or durable event sourcing. It cannot reconstruct earlier facts, and adapter acceptance does not prove backend ingestion. Already mapped messages may finish delivery after the source is released.

Engine failures are isolated and reported through the provider's error policy. The business action does not wait for analytics. See the [adapter recipe](/recipes/analytics-adapter) to connect another engine, or use the optional [Amplitude adapter](/reference/createAmplitudeAdapter).

## API reference

- [modelAnalytics](/reference/modelAnalytics)
- [createAnalytics](/reference/createAnalytics)

# Analytics

Map business facts independently for each analytics engine. A search fact can go to two engines while a product-open fact goes only to a third.

The search form, product list and product details each connect to the same $$search model through their own holo. Each View subscribes only to the values it displays. Analytics is attached once to the model: additional View owners share the connection, so one fact produces one delivery per selected engine. Removing one View leaves observation active until the final owner releases it.

<Demo kind="analytics">

<<< @/../examples/docs/analytics.tsx#analytics

</Demo>

## Connect analytics to a model

Load feature analytics when its business model acquires a committed owner.

Business factories publish domain facts without importing analytics. The application composition chooses which analytics factories to attach. There are no duplicate forwarding maps in holo.

```ts
const $$search = pipe(
  createSearchModel,

  modelRegistry({ retainTime: Infinity }),

  modelAnalytics(() =>
    import('./search.analytics').then(
      (module) => module.createSearchAnalyticsModel,
    ),
  ),
);
```

## Map facts to engines

<<< @/../examples/analytics/search.analytics.ts#search-analytics

<<< @/../examples/analytics/search-model.ts#search-model

<<< @/../examples/analytics/search.tsx#analytics-binding

Provider-specific names, units and buckets stay in inline analytics mappings. Generic infrastructure owns concurrency, queues and errors. SDKs stay outside the core bundle. An optional event-only Amplitude adapter accepts an initialized client from jotai-holo/analytics/amplitude; application code owns initialization and identity policy.

## API reference

- [modelAnalytics](/reference/modelAnalytics)
- [createAnalytics](/reference/createAnalytics)

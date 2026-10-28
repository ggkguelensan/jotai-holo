# Catalog analytics

The search form, product list and product details each connect to the same $$search model through their own holo. Each View subscribes only to the values it displays. Analytics is attached once to the model: additional View owners share the connection, so one fact produces one delivery per selected engine. Removing one View leaves observation active until the final owner releases it.

## Files

<FileNavigation>

- [search-model.ts: business state and facts](#business-model)
- [search.analytics.ts: engine mappings](#engine-mappings)
- [search.tsx: application composition](#application-composition)
- [analytics.tsx: connected Views](#connected-views)

</FileNavigation>

## Connected Views

<Demo kind="analytics">

<<< @/../examples/docs/analytics.tsx#analytics

</Demo>

## Business model

<<< @/../examples/analytics/search-model.ts#search-model

## Engine mappings

<<< @/../examples/analytics/search.analytics.ts#search-analytics

## Application composition

<<< @/../examples/analytics/search.tsx#analytics-binding

## Continue reading

- [How it works](/topics/analytics)
- [API reference](/reference/holo)

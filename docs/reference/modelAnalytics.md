# modelAnalytics

Attach an analytics model while its business model has active owners. In holo, ownership starts after React commit; outside React, it starts at explicit acquisition.

## Usage

The business factory publishes facts. The imported analytics factory receives
that selected business record and returns its observation declarations. The
[catalog example](/examples/catalog-analytics) contains both factories; this
assembly attaches them without adding analytics imports to the business code:

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

## Contract

`modelAnalytics(load, { onError? })(source) → ModelDefinition`

Import from `jotai-holo/analytics`. The modifier preserves the business model record and its creation-input type; it does not add the analytics model's fields to that record.

### Loader and child factory

`load()` returns a factory or a Promise of a factory. The factory receives the selected business record and must synchronously return an analytics model record. Return its `analytics.event(...)` declarations as top-level fields so they can be activated. Ordinary returned atoms remain lazy.

`onError` receives loader, factory and child-connection errors. It defaults to `console.error`. Engine mapping and sending errors belong to [createAnalytics.onError](/reference/createAnalytics#provider-options).

### Ownership

The first active parent owner loads and connects the child. Two owners of the same parent entry share one child. The last release stops observation; a retained parent reuses its child on return. An import that finishes after release does not activate a child.

Child declarations activate together and completed setups roll back if a later setup fails. Applying several `modelAnalytics` modifiers attaches independent children.

### Loading and early facts

Observation begins when the factory is ready. Facts emitted before then are not replayed. Loading the module does not establish a subscription by itself: an active owner must also connect the child.

If the first interaction must be observed, make the factory eagerly available and keep SDK loading lazy inside `createAnalytics` engine factories:

```ts
// Eager factory: install observation during model acquisition.
modelAnalytics(() => createSearchAnalyticsModel);
```

Connect the parent before emitting the fact. The engine queue can then retain already mapped messages while the SDK loads. It cannot recover events emitted before child activation.

The [catalog example](/examples/catalog-analytics) connects several Views to one business model and shows deliveries beside the UI. The [analytics topic](/topics/analytics) explains the separate roles of domain facts, child models and engine mappings.

## Why this API

Business factories publish domain facts without importing analytics. The application composition chooses which analytics factories to attach. There are no duplicate forwarding maps in holo.

## Analogies and reading

- [Dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) — module loading.
- [Jotai stores](https://jotai.org/docs/core/store) — independent runtimes.

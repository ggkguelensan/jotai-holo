# modelAnalytics

Load feature analytics when its business model acquires a committed owner.

Read the [Analytics overview](/overview/analytics) for the complete workflow and live examples.

## Contract

Import from jotai-holo/analytics. The loader returns a synchronous factory receiving the selected business model. Its returned managed declarations activate together and roll back on setup failure. Ordinary returned atoms remain lazy. Repeated modifiers load independently. Two owners share one child; retained parents reuse it on return. Last release stops observation. Late imports never activate a released owner.

Observation begins when the factory is ready. Earlier facts are not replayed with later state. If the first fact is essential, use an eagerly defined analytics declaration or load the feature before producing that fact. Already mapped engine messages can drain after release without observing the source.

```ts
// Eager factory: install observation during model acquisition.
modelAnalytics(() => createSearchAnalyticsModel);
```

## Why this API

Business factories publish domain facts without importing analytics. The application composition chooses which analytics factories to attach. There are no duplicate forwarding maps in holo.

## Analogies and reading

- [Dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) — module loading.
- [Jotai stores](https://jotai.org/docs/core/store) — independent runtimes.

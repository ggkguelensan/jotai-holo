# pipe

Compose model behavior in reading order: factory, registry policy, data lifecycle and analytics.

Read [Model composition](/topics/model-composition) for the complete workflow and live examples.

```ts
const $$search = pipe(
  createSearchModel,
  modelRegistry(),
  modelAnalytics(loadSearchAnalytics),
);
```

## Contract

Our `pipe` is exported from `jotai-holo/model`. It applies each modifier to the previous result. Declaration runs no model subscriptions or SDK initialization. Reuse the final definition in connected Views.

Use our `pipe` or a compatible `pipe` from another functional library, such as Effect. Model modifiers are ordinary synchronous functions; they do not depend on our `pipe`. Choose a helper that applies modifiers from left to right and preserves their TypeScript types.

## Why this API

Flat composition makes each model responsibility visible without nested calls. Modifiers retain type inference and native atoms remain available inside the factory. See the [composition guide](/topics/model-composition) for modifier order, custom connections and type preservation.

## Analogies and reading

- [Effect: Building Pipelines](https://effect.website/docs/v3/getting-started/building-pipelines) — composing functions from left to right with `pipe`.

- [TypeScript generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — preserving types across composition.

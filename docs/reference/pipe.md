# pipe

Compose model behavior in reading order: factory, registry policy, data lifecycle and analytics.

<Demo kind="model">

<<< @/../examples/docs/model.tsx#model

</Demo>

```ts
const $$search = pipe(
  createSearchModel,
  modelRegistry(),
  modelAnalytics(loadSearchAnalytics),
);
```

## Contract

Import from jotai-holo/model. pipe applies each modifier to the previous result. Declaration runs no model subscriptions or SDK initialization. Reuse the final definition in connected Views.

## Why this API

Flat composition makes each model responsibility visible without nested calls. Modifiers retain type inference and native atoms remain available inside the factory.

## Analogies and reading

- [TypeScript generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — preserving types across composition.

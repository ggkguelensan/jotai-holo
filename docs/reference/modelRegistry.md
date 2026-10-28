# modelRegistry

Share a model between an editor and a toolbar using the same key and Jotai store.

<Demo kind="model">

<<< @/../examples/docs/model.tsx#model

</Demo>

```ts
import { modelRegistry, pipe } from 'jotai-holo/model';

const $$profile = pipe(
  createProfileModel,
  modelRegistry({ retainTime: Infinity }),
);

const $profile = $$profile({
  key: ['profile', { id: '42' }],
  initial: { profileId: '42' },
});
```

## Contract

Identity is definition + structural key + store. Without a key, select the default instance. Initial data is creation-only. Reading creates no subscriptions; acquisition activates managed declarations. The last release disconnects them. Infinity retains the instance, not its subscriptions. Use remove for unbounded key spaces; active entries cannot be removed.

## Why this API

Compose plain synchronous factories with pipe. Modifiers flatten into one definition instead of nesting registries. Reusing the final definition shares instances; separate registry applications define separate namespaces.

## Analogies and reading

- [Jotai stores](https://jotai.org/docs/core/store) — state isolation.
- [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — structural identity analogy.

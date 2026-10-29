# modelRegistry

Share a model between an editor and a toolbar using the same key and Jotai store.

<span id="why-use-a-registry"></span>
<span id="what-the-registry-adds"></span>
<span id="when-a-registry-is-unnecessary"></span>

## Usage

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

`modelRegistry({ retainTime?, initial? })(source) → ModelDefinition`

The source is a synchronous model factory or an existing model definition. The returned definition selects instances and exposes `acquire`, `flush` and `remove`.

### Select an instance

| Value                         | Meaning                                            |
| ----------------------------- | -------------------------------------------------- |
| `createProfileModel`          | Factory that creates a record of atoms and actions |
| `$$profile`                   | Definition returned by the modifier                |
| `$$profile({ key, initial })` | Read-only atom selecting an instance in a store    |
| `store.get($profile)`         | The selected record; reading does not acquire it   |

Components using the same registry namespace, structural key and Jotai store share a record. Another key or store selects another instance. Omitting `key` selects the default instance.

A namespace is the set of records established by one registry application.
Adding `modelConnection`, `modelLifecycle` or `modelAnalytics` to that definition
preserves its records: the decorated and original definitions select the same
instance for the same key and store. Applying `modelRegistry()` again creates a
new namespace with independent records. Declare and reuse the final pipeline
outside render; see [modifier order](/topics/model-composition#modifier-order-and-identity).

`key` is an array of strings, finite numbers, booleans, nulls, nested arrays and plain objects containing those values. Object property order does not matter. Functions, dates, undefined values and cycles are unsupported.

`initial` supplies creation data. A selection's explicit `initial` takes precedence over the modifier's default. If the instance already exists, another selection with different initial data returns that existing record unchanged. Use a command or [holo.input](/reference/holo#input) to update it.

### Acquire outside React

`holo.models` acquires selected models after commit. Outside React, acquire and release explicitly:

```ts
const $$profile = pipe(createProfileModel, modelRegistry());
const selection = {
  key: ['profile', '42'],
  initial: { profileId: '42' },
};

const lease = $$profile.acquire(store, selection);

try {
  // lease.model is the record, not an atom selecting that record.
  const draft = store.get(lease.model.$draft);
} finally {
  lease.release();
}
```

The first owner activates managed declarations returned by the factory and connections added by modifiers. Additional owners share that work. The last release disconnects it; repeated release calls do nothing.

### Retain state after release

`retainTime` defaults to `Infinity`. It is a non-negative duration in milliseconds, measured from the last release. It keeps the acquired record, not its subscriptions. Finite retention allows a later selection to create a fresh record after eviction.

Pure reads are weakly cached. Reading a selection alone does not permanently retain the record or start its connections. After acquisition, the retention policy applies. See [models and registry](/topics/models-and-registries) for choosing instance scope.

### Flush and remove

| Method                             | Result                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| `lease.flush()`                    | Flush pending saves for the acquired instance             |
| `$$profile.flush(store, { key })`  | Flush an existing selected instance without activating it |
| `$$profile.remove(store, { key })` | Evict an inactive instance; return whether it was removed |

Flush returns `Promise<void>` and rejects if a saving modifier fails. A registry without saving modifiers has nothing to flush. Removal returns `false` if the entry is absent or still has owners. It does not flush automatically.

Await flush before removal when saved data matters. For an unbounded set of keys, choose finite retention or explicitly remove unused entries. Neither retention nor flush makes in-memory state survive a page reload; [modelLifecycle](/reference/modelLifecycle) and [persist](/reference/persist) describe storage integration.

## Why this API

Compose plain synchronous factories with pipe. Modifiers flatten into one definition instead of nesting registries. Reusing the final definition shares instances; separate registry applications define separate namespaces.

## Analogies and reading

- [Jotai stores](https://jotai.org/docs/core/store) — state isolation.
- [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — structural identity analogy.

# createModel

Share one model between widgets by key. A proposal editor and its toolbar select the same instance when they use the same key and Jotai store.

<Demo kind="model">

<<< @/../examples/docs/model.tsx#model

</Demo>

## Usage

```ts
import { createModel } from 'jotai-holo/model';

const Proposal = createModel({
  initial: { seats: 5 },
  create: (initial) => createProposal(initial),
  retainTime: Infinity, // default
  resources: (model) => [model.saving],
});

const $default = Proposal();
const $atlas = Proposal({ key: ['proposal', { id: 'atlas' }] });
const $$atlas = store.get($atlas); // pure read; no resource connection
const lease = Proposal.acquire(store, { key: ['proposal', { id: 'atlas' }] });
lease.release(); // idempotent; disconnect after the last owner
Proposal.remove(store, { key: ['proposal', { id: 'atlas' }] });
```

## Contract

### Create and select an instance

- `create(initial)` is pure and synchronous. Declare atom definitions, actions, and bonds here; declare connections in `resources(model)`. It returns an object.
- The returned definition creates read-only model atoms. The same definition, structural key, and store resolve one instance. Different definitions or stores isolate instances. Without a key, the default instance is selected. An empty key is distinct from default.
- Keys are JSON-like arrays: finite numbers, strings, booleans, null, arrays, and plain objects. Object property order does not matter; array order does. Undefined, functions, symbols, dates, cycles, and non-finite numbers are rejected. Keys are identifiers, not arbitrary objects.
- `initial` is creation-only. A later caller with the same key does not reset a shared model. Define an explicit action for updates.

### Connect and release resources

- Pure reads use weak caching and do not acquire resources. Abandoned render does not acquire ownership. A provisional instance may be recreated after collection.
- `acquire` creates a lease. First owner acquires resources; last release invokes their synchronous cleanup. Exceptions propagate; ownership is rolled back if resource acquisition throws. Cleanup does not cancel async application work automatically.
- `holo({ models: { proposal: Proposal }, … })` acquires after commit and releases on cleanup. Each named selector can choose a structural key from input props. read/write/resources factories receive the resolved named models. Changing model identity remounts the connected View.

### Keep or remove a model

- `retainTime: Infinity` retains acquired instances for the store lifetime. It does **not** retain active subscriptions after release. Finite retainTime starts after the last release and is cancelled on reacquire. Zero schedules removal for the next task, so StrictMode replay can reacquire safely.
- `remove` returns false for an active or absent instance, true after removal. Existing selection handles resolve a new generation on their next read. Infinity requires deliberate removal for unbounded key spaces.

In React, temporary Suspense hiding retains the lease. Actual unmount releases in a microtask after passive cleanup. Replacing the selected model or store closes the old lifecycle and resources before activating the new owner. onUnmount runs before its resources disconnect, so synchronous facts can reach connected bonds. Explicit lease.release() outside React remains synchronous.

## Why this API

Use a key when separate parts of the screen need the same model. Store isolation separates users or requests; keys separate resources within that store. For a model used by only one widget, a plain atom factory may be enough.

## Analogies and reading

- [Jotai store](https://jotai.org/docs/core/store) — values and ownership per store.
- [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — structural resource identity; the model registry does not implement network caching.

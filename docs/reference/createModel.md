# createModel

Share a default or keyed model within a Jotai store, without another scope provider.

<Demo kind="model">

<<< @/../examples/docs/model.tsx#model

</Demo>

## Usage

```ts
import { createModel } from 'jotai-holo/model';

const Proposal = createModel({
  initial: { seats: 5 },
  create: (initial) => createProposal(initial),
  gcTime: Infinity, // default
  connect: ($$proposal, store) => $$proposal.saving.connect(store),
});

const $default = Proposal();
const $atlas = Proposal({ key: ['proposal', { id: 'atlas' }] });
const $$atlas = store.get($atlas); // pure read; no resource connection
const lease = Proposal.acquire(store, { key: ['proposal', { id: 'atlas' }] });
lease.release(); // idempotent; disconnect after the last owner
Proposal.remove(store, { key: ['proposal', { id: 'atlas' }] });
```

## Contract

- `create(initial)` is pure and synchronous. Declare atom definitions, actions, and bonds here; connect resources only in `connect(model, store)`. It returns an object.
- The returned definition creates read-only model atoms. The same definition, structural key, and store resolve one instance. Different definitions or stores isolate instances. Without a key, the default instance is selected. An empty key is distinct from default.
- Keys are JSON-like arrays: finite numbers, strings, booleans, null, arrays, and plain objects. Object property order does not matter; array order does. Undefined, functions, symbols, dates, cycles, and non-finite numbers are rejected. Keys are identifiers, not arbitrary objects.
- `initial` is creation-only. A later caller with the same key does not reset a shared model. Define an explicit action for updates.
- Pure reads use weak caching and do not acquire resources. Abandoned render does not acquire ownership. A provisional instance may be recreated after collection.
- `acquire` creates a lease. First owner invokes `connect`; last release invokes its synchronous cleanup. Exceptions propagate; ownership is rolled back if connect throws. Cleanup does not cancel async application work automatically.
- `gcTime: Infinity` retains acquired instances for the store lifetime. It does **not** retain active subscriptions after release. Finite gcTime starts after the last release and is cancelled on reacquire. Zero schedules removal for the next task, so StrictMode replay can reacquire safely.
- `remove` returns false for an active or absent instance, true after removal. Existing selection handles resolve a new generation on their next read. Infinity requires deliberate removal for unbounded key spaces.
- `holo({ model, … })` acquires after commit and releases on cleanup; keyed selectors use `model: props => Proposal({key: […]})`. State/actions/cage factories receive the resolved model. Changing model identity remounts the connected View.

In React, temporary Suspense hiding retains the lease. After actual unmount or model replacement, release is scheduled in a microtask after child passive cleanup so a synchronous cage.onUnmount fact can reach its connected bond. Explicit lease.release() outside React remains synchronous.

## Why this API

Jotai Provider already supplies store ownership. A separate registry provider adds scope decisions at every subtree. This registry uses that store and explicit keys; a pure factory handles creation, while committed leases handle resources. Use ordinary factory-created atoms when no cross-widget sharing is needed. Bunshi remains an optional alternative for applications needing its injector and molecule dependency resolution; createModel does not reproduce automatic dependency injection.

## Analogies and reading

- [Jotai store](https://jotai.org/docs/core/store) — values and ownership per store.
- [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — structural resource identity; the model registry does not implement network caching.
- [Bunshi](https://github.com/saasquatch/bunshi) — an alternative for scopes and dependency injection.

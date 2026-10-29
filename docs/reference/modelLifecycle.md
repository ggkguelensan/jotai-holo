# modelLifecycle

Load a saved draft and save edits when its last owner leaves.

The example restores a draft from browser session storage and writes it back when the last editor leaves:

<<< @/../examples/docs/data-lifecycle.tsx#draft-lifecycle

For server requests, use TanStack Query options and [Query/Mutation models](/topics/tanstack-models) when the atom graph needs them. Use native hooks for React-only requests. Do not duplicate request status, caching or retry policy in a lifecycle callback. A custom transport can still belong here when its ownership protocol requires it.

## Contract

Load starts on activation and runs once after successful initialization of a retained instance. Release aborts loading; a later owner can retry an interrupted or failed load. Restore is synchronous. When snapshot is supplied, local edits win over a late load. Snapshot values must be synchronous and immutable.

Dirty snapshots save on last release. Writes are serialized per instance. Await definition.flush(store, { key }) or lease.flush() when completion matters; flush does not activate a cold model. Background failures reach onError; explicit flush rejects. Operations time out after 10 seconds by default. Cancellation requires the transport to honor AbortSignal.

## Why this API

Data loading and persistence belong to the selected model instance. React cleanup cannot await a save; explicit flush makes that requirement visible. Use native Query or RHF defaults when they already own this lifecycle.

## Analogies and reading

- [Jotai async](https://jotai.org/docs/guides/async) — native asynchronous atoms.
- [React effects](https://react.dev/reference/react/useEffect) — cleanup constraints.

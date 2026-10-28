# modelConnection

Connect a tracking feed while at least one widget owns a shipment model. Keep transport setup separate from atom construction.

<<< @/../examples/model-composition.ts#modifier

## Contract

Import from jotai-holo/model. modelConnection(connect) returns a model-preserving modifier. connect receives the selected model and { store, initial }. It runs on the first active owner and returns a synchronous disposer or undefined. The final owner releases it; another activation reconnects. Declaration and reads do no connection work.

Connections compose in declaration order, clean up in reverse order, and roll back on setup failure. A modifier applied to an existing registry preserves its records. Different entries or stores have independent connections. Do not return a Promise; asynchronous initialization needs a cancellation and error policy inside the adapter, or modelLifecycle.

## Why this API

A custom modifier should reuse ownership and rollback without exposing registry internals. Return bonds directly from factories for atom-to-atom routing; use this helper for external subscriptions. See the [composition guide](/guide/model-composition) for modifier authoring and type preservation.

## Analogies and reading

- [Jotai store](https://jotai.org/docs/core/store) — reads, writes and subscriptions in one store.
- [TypeScript generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — preserving a factory's model and input types.

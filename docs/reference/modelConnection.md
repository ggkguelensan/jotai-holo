# modelConnection

Connect a tracking feed while at least one widget owns a shipment model. Keep transport setup separate from atom construction.

## Usage

Given the shipment factory and tracking adapter from the
[composition example](/topics/model-composition#start-with-a-pure-factory),
connect the feed when the selected instance gets its first owner:

```ts
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';

const $$shipment = pipe(
  createShipmentModel,

  modelConnection(($$shipment, { store, initial }) =>
    trackingFeed.subscribe(initial.shipmentId, (status) => {
      store.set($$shipment.statusReceived, status);
    }),
  ),

  modelRegistry(),
);
```

`subscribe` returns the disposer. The last owner calls it to stop receiving
updates. Use `$$shipment` in `holo.models`, or explicitly acquire it outside
React with [acquire](/reference/modelRegistry#acquire-outside-react).

## Contract

`modelConnection(connect)(source) → ModelDefinition`

Import from `jotai-holo/model`. The source can be a synchronous factory or an existing definition. The modifier preserves its model record and creation-input types.

### Setup and cleanup

`connect(model, { store, initial })` runs on the first active owner. It returns a synchronous disposer or undefined. The final owner calls that disposer; another activation reconnects. Declaration and reads do no connection work.

Connections compose in declaration order and clean up in reverse order. If a later setup fails, earlier completed setups are disposed. Each setup must undo its own partial work before throwing: it has not yet returned a disposer.

A modifier applied to an existing registry preserves its records. Different entries or stores have independent connections. Do not return a Promise or an array of bonds from this callback; the current API accepts only a synchronous disposer. Use [modelLifecycle](/reference/modelLifecycle) for managed loading and saving, or give an asynchronous adapter its own cancellation and error policy.

## Why this API

A custom modifier reuses ownership and rollback without accessing registry internals. A factory may return bonds that connect its own atoms. Connections to Query, Mutation or other external models belong in application composition, so the business factory stays independent of those integrations.

The [composition guide](/topics/model-composition#write-a-custom-modifier) shows a typed tracking-feed modifier. The [server-data recipe](/recipes/server-data#a-model-working-with-server-data) connects external Query data without manual subscription bookkeeping.

## Analogies and reading

- [Jotai store](https://jotai.org/docs/core/store) — reads, writes and subscriptions in one store.
- [TypeScript generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — preserving a factory's model and input types.

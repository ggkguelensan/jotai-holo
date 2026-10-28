# Model composition

A shipment page and its status badge need the same live status. A factory defines the atoms; modifiers decide how long the instance lives and when its tracking feed connects. The View receives ordinary props.

## Start with a pure factory

<<< @/../examples/model-composition.ts#factory

The factory creates a record synchronously. It does not open sockets, read storage or run hooks. Use a plain factory without a registry when the caller already owns the instance. Use a derived atom for a calculation, an action for a command and an event for a fact with independent consumers.

## Compose responsibilities

<<< @/../examples/model-composition.ts#composition

Call createShipmentDefinition once during application setup with your tracking adapter. Reuse the returned $$shipment definition outside React. pipe applies modifiers from left to right; it does not create a model until an instance is selected and read.

```tsx
const $$shipment = createShipmentDefinition(trackingFeed);

const Shipment = holo({
  models: {
    shipment: (props: { shipmentId: string }) =>
      $$shipment({
        key: ['shipment', props.shipmentId],
        initial: { shipmentId: props.shipmentId },
      }),
  },
  view: ShipmentView,
  read: ({ shipment }) => ({ status: shipment.$status }),
});
```

Two widgets selecting the same key in one store share atoms and one feed subscription. The first committed owner connects; the last release disconnects. Another key or store gets another instance. initial seeds creation only; changing input on an existing instance requires an explicit action or holo.input.

## Modifier order and identity

modelRegistry establishes a registry namespace. Adding modelConnection, modelLifecycle or modelAnalytics to an existing definition preserves its records and shares inherited activations. Applying modelRegistry again establishes a separate namespace. Define the final pipeline once; rebuilding it creates different definitions.

```ts
const $$base = pipe(createShipmentModel, modelRegistry());
const $$tracked = pipe($$base, modelTrackingFeed(trackingFeed));

// Same record for the same key and store; only $$tracked owns the feed.
// A new explicit registry creates independent records.
const $$independent = pipe($$tracked, modelRegistry());
```

Connections activate in declaration order and release in reverse order. If a later connection fails, earlier connections roll back. Keep dependencies explicit: reading another model does not acquire its connections, and keys do not propagate to dependencies automatically.

## Write a custom modifier

<<< @/../examples/model-composition.ts#modifier

A modifier is an ordinary function from ModelSource to ModelDefinition. ModelSource accepts either a pure factory or an existing definition. modelConnection preserves the record and initial types, gives setup the selected store and creation input, and owns its synchronous disposer. It also shares setup across owners and handles rollback between modifiers.

The tracking adapter supplies the transport; the model never imports a socket singleton. Tests can pass a fake feed. The callback receives updates only while the connection is active. The adapter must unsubscribe and ignore late callbacks after cleanup. Setup must undo any partial work before throwing; a cleanup cannot undo work that failed before it was returned.

Use modelLifecycle inside a custom modifier when the task is loading and saving snapshots. Use modelAnalytics for a lazy analytic child. modelConnection is for subscriptions or external handles with synchronous setup and cleanup. Do not use it for values that ion or a derived atom can calculate.

## Type preservation

Built-in modifiers preserve the model record, writable arguments, action results and initial input. pipe checks adjacent steps, including long chains of model-preserving modifiers. Give reusable custom modifiers an explicit ModelSource<Model, Initial> parameter so inference does not widen their input to object or any.

A connection modifier cannot add fields to the record. Add atoms in the factory, or compose pure factory functions before applying modelRegistry. A cast to ModelDefinition does not install ownership behavior. Public helpers avoid depending on internal symbols or registry maps.

<<< @/../examples/model-composition.ts#extend

## Select and own outside React

```ts
const store = createStore();
const selection = {
  key: ['shipment', '42'],
  initial: { shipmentId: '42' },
};
const lease = $$shipment.acquire(store, selection);

try {
  const status = store.get(lease.model.$status);
} finally {
  lease.release();
}
```

A store.get read alone creates no connection. retainTime defaults to Infinity: state survives release, subscriptions do not. Use finite retention or explicit remove for unbounded keys. Await flush before removal when saved data matters; React cleanup cannot wait for a save.

See [modelRegistry](/reference/modelRegistry), [modelConnection](/reference/modelConnection), [modelLifecycle](/reference/modelLifecycle) and [modelAnalytics](/reference/modelAnalytics) for individual contracts.

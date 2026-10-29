# Model composition

A game-download badge needs progress updates while its page is open. The download model should also work in a test without a progress service. Keep the atoms in a factory and add the subscription with a modifier.

## Start with a pure factory

<<< @/../examples/model-composition.ts#factory

The factory creates its record synchronously, starting at `queued`. `statusReceived` accepts `downloading` and `installed` updates from any source, so the factory does not import a transport or analytics client.

## Compose responsibilities

Declare the final definition once at module scope. `pipe` applies each modifier from left to right.

```ts
const $$download = pipe(
  createDownloadModel,
  modelRegistry(),
  modelDownloadFeed(downloadFeed),
);
```

`modelRegistry` selects instances by key. Our application-specific `modelDownloadFeed` attaches tracking to the selected download. It does not add fields to its record.

```tsx
const Download = holo({
  models: {
    download: (props: { downloadId: string }) =>
      $$download({
        key: ['download', props.downloadId],
        initial: { downloadId: props.downloadId },
      }),
  },
  view: DownloadView,
  read: ({ download }) => ({ status: download.$status }),
});
```

Two widgets selecting the same instance share one progress subscription. The first committed owner connects; the last release stops observing progress. The download job belongs to the launcher service and continues independently of these View owners. `initial` seeds creation only: a new value for an existing key does not recreate the model. To change an existing instance, call an action or bind a committed prop through `holo.input`.

## Choose a pipe

Use `pipe` from `jotai-holo/model`, or a compatible implementation from another functional library. [Effect: Building Pipelines](https://effect.website/docs/v3/getting-started/building-pipelines) explains the same left-to-right composition. Effect is optional.

## Modifier order and identity

A connection modifier applied to an existing definition preserves its records and inherited connections. An explicit `modelRegistry()` starts a new registry identity. Declare the completed pipeline once; rebuilding it creates a new definition.

```ts
const $$base = pipe(createDownloadModel, modelRegistry());
const $$tracked = pipe($$base, modelDownloadFeed(downloadFeed));
const $$independent = pipe($$tracked, modelRegistry());
```

`$$base` and `$$tracked` select the same record for a key and store; only an owner of `$$tracked` activates its added feed. `$$independent` selects separate records. Connections start in declaration order and release in reverse order. If a later setup throws, already connected steps roll back.

## Write a custom modifier

Here is the implementation of `modelDownloadFeed`. It receives a transport adapter, so tests can provide a fake feed.

<<< @/../examples/model-composition.ts#modifier

`modelConnection` receives the selected record, store and creation input. The subscription returns a synchronous disposer. Setup must clean up any partial work before throwing; after disposal, the adapter must stop delivering callbacks.

Use this pattern for external subscriptions and handles. Use `modelLifecycle` for loading and saving snapshots, and `modelAnalytics` for lazy analytics. Calculations belong in derived atoms instead of connections.

## Type preservation

The generic `ModelSource<Model, Initial>` accepts either a factory or an existing definition. Keeping both types in a reusable modifier preserves additional record fields and the factory's input through `pipe`. Built-in modifiers also preserve writable arguments and action results.

To add fields, extend a factory before applying managed modifiers:

<<< @/../examples/model-composition.ts#extend

Casting a function to `ModelDefinition` does not install ownership behavior. Build custom modifiers from public helpers rather than copying internal symbols or registry maps.

## Select and own outside React

```ts
const store = createStore();
const lease = $$download.acquire(store, {
  key: ['download', '42'],
  initial: { downloadId: '42' },
});

try {
  const status = store.get(lease.model.$status);
} finally {
  lease.release();
}
```

A `store.get` read alone does not acquire connections. Retention keeps the record after release, not its subscriptions.

## Loading and saving

When work must be saved before leaving a workflow, await `flush` explicitly. React cleanup cannot wait for a save. The [persistence recipe](/recipes/server-data#a-model-saving-locally) covers loading, saving and retained drafts.

## API reference

- [pipe](/reference/pipe)
- [modelConnection](/reference/modelConnection)
- [modelLifecycle](/reference/modelLifecycle)

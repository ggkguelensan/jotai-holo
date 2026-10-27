# Named models, resources and imperative Views

The only React configuration uses view, named models, read, write, props, lifecycle, resources and imperative. No compatibility aliases or parallel binding runtime remain.

```text
models: instance selections
             ↓
read: atom values ─────────→ View props
write: writable atoms ←──── View callbacks
imperative: events ────────→ View methods
resources: acquired after commit, released after the last owner
```

## Read and write

Use `view`, `read`, `write` and `props` for ordinary atom bindings. Both sections accept native Jotai atoms; helpers are optional. Writable derived atoms can appear in both sections. Async reads resolve before reaching View; write callbacks preserve the original arguments and return value.

## Named instances

```tsx
const Search = holo({
  models: {
    search: (input: { workspaceId: string }) =>
      $$search({ key: ['search', input.workspaceId] }),
    session: $$session,
  },
  view: SearchView,
  read: ({ search }) => ({ results: search.$results }),
  write: ({ search }) => ({ onSearch: search.search }),
  props: { title: 'Search' },
});
```

Annotate selector input types: these become required public component props, including inputs the View does not consume. A definition chooses the default instance; a selection chooses a structural key. Identity is definition + key + store. Changing selected model values remounts the resolved binding and its View. Ordinary input changes do not remount it.

State subscriptions are independent of model acquisition. An actions-only binding does not read unused model state. Model selections and native async model atoms resolve before binding factories execute.

## Lifecycle

```tsx
lifecycle: {
  input: input => ({ term: input.term }),

  onInputChange(_get, set, ctx) {
    set(ctx.models.search.inputChanged, ctx.input.term);
  },
},
```

Handlers accept inline synchronous functions or writable atoms receiving the context. Zero-argument action atoms also work. `ctx.input` contains committed caller props plus fixed props, excluding generated bindings. `ctx.models` contains resolved instances. The selector compares chosen fields shallowly; without it all input fields are compared. The first commit invokes onInputChange.

Resources connect before onMount and the initial onInputChange. On actual release, onUnmount runs before resources disconnect. Passive cleanup is deferred to a microtask so StrictMode cleanup/setup remains one logical owner. Temporary Suspense hiding keeps model/resource ownership but stops imperative delivery while the View handle is absent. Lifecycle errors are reported through onError; async lifecycle handlers are rejected at runtime. Start asynchronous work in an action and handle its promise explicitly.

## Resource ownership and retention

```ts
const $$draft = createModel({
  create: () => createDraft(),
  resources: (model) => [model.recording, model.persistence],
  retainTime: Infinity,
});
```

A resource has `connect(store)` returning synchronous cleanup or undefined. The same resource object shares one connection per store. Last release disconnects it. Acquisition rolls back in reverse order; cleanup attempts every resource even if one fails. Keep declarations pure. Model resources use the same ownership contract as View resources.

`retainTime` is the model retention setting; no alias is accepted. Units are milliseconds. Infinity is the default, zero schedules eviction for the next task, finite values start after the last release. Retention preserves the instance, not active subscriptions. Call remove for unbounded key spaces. createFormModel accepts retainTime too.

## Persistence

Import `persist` and `localStorageAdapter` from `jotai-holo/persist`. This optional entry adds no storage code to ordinary holo imports.

```ts
const persistence = persist({
  read: $draft,
  restore: draftRestored,
  storage: localStorageAdapter(),
  key: 'proposal-draft',
  codec: {
    decode: (value) => z.parse(draftSchema, value),
    encode: (value) => z.encode(draftSchema, value),
  },
  save: { debounce: 500 },
});
```

The codec is library-independent; Zod Mini is one possible application dependency. Restore must apply the decoded value synchronously. Missing storage is represented by undefined. Local edits win over late restoration. Successful restoration runs once per resource/store; reconnecting a retained model does not replace it with an older snapshot. A failed restoration can retry after reacquisition.

Writes are serialized, selected values are captured on change, and release attempts to flush the last captured edit without retaining a live subscription. Explicit flush waits for restoration and pending writes. $restoring, $saving, $dirty and $error are independent observable atoms. The default operation timeout is ten seconds; timeout aborts supported work and ignores late restoration. An external implementation that ignores cancellation can still finish its own side effects.

Storage adapters implement read(key, signal) and write(key, value, signal). IndexedDB can implement this asynchronous interface; no built-in IndexedDB adapter is included yet. Codecs do not replace version migrations. Server conflict resolution belongs to Query/Mutation and business logic, not this persistence contract. Closing a tab does not guarantee async saving.

## Remaining work

The lazy multi-provider analytics runtime and a committed-input observer bridge remain design proposals, not exports. The event-only Amplitude candidate and adapter-authoring prompt are in design/analytics. Existing Query, Mutation and RHF entries remain available. This change does not implement a new analytics SDK or replace their protocols.

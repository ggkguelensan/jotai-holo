# Models, committed input and analytics

Declare `holo({ view, models, read, write, props, input, imperative, onError })`
outside React. Raw lifecycle/resources fields are rejected.

```text
pure factory → pipe modifiers → selected instance → committed owner
                    │                 │                  │
              registry policy    store + key       managed activation
                                                        │
                                                 final-owner release
```

## Model composition

Import `pipe`, `modelRegistry`, `modelLifecycle` from `jotai-holo/model` and
`modelAnalytics` from `jotai-holo/analytics`. Modifiers flatten into one final
definition. They do not nest registries or create extra business records.
Separate registry applications are separate namespaces. Additional modifiers of an existing registry share its business records. Reads do no connection work.

Returned bonds, persistence declarations and analytics observations carry an
explicit internal managed marker. Acquisition activates only those declarations;
it does not subscribe to every returned atom. Setup rolls back in reverse order.
Two owners share the same connection, and the final release stops it.
Use `modelConnection` for external subscriptions and synchronous cleanup.

Infinity retention preserves state without preserving active subscriptions.
Finite retention starts after last release. Pure reads are weakly cached so
abandoned renders do not permanently retain keyed entries. Explicit removal
refuses active entries. Flush data before removal when persistence matters.

## Data lifecycle

`load` starts on activation and is retried after interrupted/failed initialization.
Successful initialization runs once per retained instance. `restore` is synchronous.
`snapshot`, when provided, protects edits from late restoration and records dirty
immutable values. Saves begin after final release and serialize revisions.
`definition.flush(store, { key })` and `lease.flush()` await required saves without
activating a cold instance. They reject failures; background work reports onError.
The default operation deadline is 10 seconds. A transport must honor AbortSignal;
cleanup cannot forcibly cancel a request already accepted by a server.

## React ownership

Input forwards initial and changed selected props after commit using Object.is per
field. It allocates no intermediary atom or proxy. Fixed props win, generated
read/write/imperative props are excluded, and unrelated input changes do no work.
Native writable atoms, commands and event atoms are valid targets.

StrictMode replay is one logical owner. Initial Suspense and abandoned renders
activate nothing. Temporary Suspense hiding preserves ownership while imperative
handles are absent. On replacement, the old owner releases before the next one
activates. Actual unmount releases in a microtask. A child effect can run before
the parent's commit effect: do not promise observation of child mount emissions.

## Analytics

One shared createAnalytics declaration contains lazy engine factories. Engine
clients and queues are independent per store. Feature-specific modelAnalytics
factories observe the selected parent directly; no forwarding maps in holo.
They load concurrently, cache successful child records by parent/store, reconnect
on return, and never activate a released parent after a late import.

Capture begins after the feature factory is ready. The infrastructure cannot
sample unknown state projections before loading their declaration. Early facts
are therefore not replayed. Use an eager managed declaration for essential
initial facts: `modelAnalytics(() => createSearchAnalyticsModel)` installs it synchronously at acquisition. Dynamic loading limitations are covered by an executable regression test.

Each event map runs at occurrence time and produces a detached frozen JSON value.
Each engine has an independent FIFO handoff worker. Defaults: 100 pending messages,
30-second message/operation deadline, discard newest on overflow, no automatic
retry after ambiguous send. Factory failures discard that engine's queued work;
a later event can retry initialization. Healthy engines continue independently.

Final-owner release stops capture; already mapped messages may drain within their
deadline. flush is a best-effort wait/handoff/SDK flush, not an ingestion guarantee.
dispose aborts workers, empties queues and closes engines for that store. Future
publications cannot reinitialize them. Late loaded adapters use genuine dispose
when supplied. No payload histories are retained in diagnostic state.

## RHF, Query and persistence

createFormModel returns a pure factory. Apply modelRegistry explicitly, then use
holoForm's named models and form selector. Native RHF markup, Controller, contexts,
async defaults and transforming resolvers retain their semantics. Ordinary holo
can connect a toolbar to the same selected form.

Query and Mutation keep the existing QueryClient cache. Their independently lazy
projections and read-driven observer ownership are unchanged. Persistence records
are managed declarations: returning one from a model activates it while owned.

Analytics, data lifecycle, RHF, Query and vendor adapters use separate entry points.
The ordinary holo runtime imports none of their implementations.

# Analytics models and lazy adapters

Status: design proposal. `createAnalyticsModel`, `analyticsConnection` and the
analytics connection factories below are not implemented or exported. The TypeScript
files in this directory are a candidate adapter contract and an event-only
Amplitude example, not a released integration. No real analytics are enabled by
this proposal.

## Scope and names

Use `createAnalyticsModel` for an application-owned model definition and name
that definition `$$analytics`. A provider is a plain lazy adapter definition,
not an `analyticsProviderAtom`: an SDK instance is an imperative resource, not
observable business state. Provider diagnostics are ordinary atoms.

Keep the core in a future optional `jotai-holo/analytics` entry. Reuse
`createModel`, native atoms, independent projections, event dispatch and one
resource ownership protocol. Do not import SDKs from core/model/React entries.
An Amplitude adapter must live in its own optional module or in application
code; importing the generic analytics entry must not include any vendor SDK.

## Dependencies

```text
Business models → shared domain contracts ← application composition
                                                    ↓
                                      lightweight analytics connection
                                                    ↓
                                      $$analytics in the current store
                                         ↓      ↓      ↓      ↓
                                      adapter adapter adapter adapter
                                         ↓      ↓      ↓      ↓
                                       vendor  vendor  vendor  internal
```

Business models publish meaningful facts such as `itemAdded` after a cart
mutation succeeds. They do not import analytics models, adapter factories or
SDKs. The composition module projects those facts into application analytics
messages. Analytics consumers do not need a live source model to interpret a
queued message.

## Target declaration

The following API is illustrative and remains subject to implementation review.
All provider definitions and source connection definitions are declared outside
React render.

```tsx
const $$analytics = createAnalyticsModel<AppMessage, AppContext>()({
  providers: {
    amplitude: {
      accepts: ['cart.itemAdded', 'cart.opened'],
      enabled: $productAnalyticsEnabled,
      load: () =>
        import('./adapters/amplitude').then((module) =>
          module.createAdapter(amplitudeConfig),
        ),
    },
    productInsights: {
      accepts: ['cart.itemAdded'],
      load: () =>
        import('./adapters/product-insights').then((m) => m.createAdapter()),
    },
    marketing: {
      accepts: ['checkout.completed'],
      load: () => import('./adapters/marketing').then((m) => m.createAdapter()),
    },
    internal: {
      accepts: ['cart.itemAdded', 'cart.opened', 'checkout.completed'],
      load: () => import('./adapters/internal').then((m) => m.createAdapter()),
    },
  },
});

const cartAnalytics = analyticsConnection({
  target: $$analytics,
  load: () =>
    import('./analytics/cart.analytics').then(
      (module) => module.createConsumer,
    ),
  events: (model: CartModel) => ({
    itemAdded: model.itemAdded,
  }),
  state: (model: CartModel) => ({
    total: { source: model.$total, initial: 'skip' },
  }),
});

const Cart = holo({
  models: { cart: $$cart },
  view: CartView,
  read: ({ cart }) => ({ count: cart.$count }),
  write: ({ cart }) => ({ onAdd: cart.addItem }),
  resources: ({ cart }) => [cartAnalytics(cart)],
});
```

The generic `resources` protocol also belongs in `createModel` for its own
business resources. Model factories must stay pure; neither declaration nor
render acquires a connection. The generic owner connects in commit time, counts
owners, rolls back failed acquisition and releases in reverse order. Analytics
operational errors are isolated within the analytics connection and do not
throw through a business action or React render.

A provider's `accepts` list is lightweight and checked before loading it. There
is no central SDK-shaped interface containing track/identify/group/revenue.
Providers may translate typed application messages into any of these operations.
An imperative publisher must acquire an explicit runtime lease outside React.
Publishing with no owner must not silently initialize SDKs; return an inactive
outcome and report a bounded diagnostic.

## Lazy analytics consumers are not SDK adapters

There are two independent loading boundaries. `analyticsConnection.load` loads
feature-specific analytics rules after the source's first committed owner. The
provider's `load` imports its SDK adapter only for the first eligible output
message. Opening the cart can load cart analysis without loading all four SDKs.

Before the feature module loads, the bridge captures named source facts and
state changes in a bounded input queue. The lightweight source declaration
selects only the fields intended for analysis; it does not contain analytical
business rules. The module returns a scoped consumer factory, supplied with a
publisher rather than importing the root analytics model. That consumer may
reuse createModel, eventAtom, bond and derived atoms for its own calculations.
Its state belongs to the selected source/store and is acquired only after load.

The consumer produces application analytics messages, which the shared
`$$analytics` model fans out. All feature consumers share provider definitions
and their store-owned SDK runtimes, not one instance of every SDK per feature
or View. Output messages inherit captured source/context/time and get distinct
output IDs when one source fact produces multiple outputs. Provider fan-out
then reuses that output envelope unchanged.

Capture stops with the last source owner. Input-queue processing and provider
queues use the same bounded lazy-consumer machinery rather than independent
unbounded queue implementations. If an unmounted source has pending input,
its consumer may finish bounded work without re-reading or retaining the live
source model. Queue budgets must cover both stages and provider fan-out.

A direct lightweight message mapping may omit the feature loader. That is an
explicit fast path, not a requirement to place every analytics rule eagerly
in the composition module. The exact consumer factory types still need a
compile-time prototype together with the resource connection implementation.

## Messages and identity

`protocol.ts` defines the candidate wire contract. A message has a typed `type`
and JSON-compatible `payload`. Its envelope adds an ID, occurrence timestamp,
source identity and application-defined context. The core owns these transport
fields; SDK-specific event names, user traits and device rules belong in the
adapter.

Capture and validate a detached JSON-compatible snapshot before queueing. A
TypeScript readonly type alone is not a snapshot. Never retain React events,
DOM nodes, component props objects, source models, functions or getters in a
queued envelope. Reject cycles and unsupported values with a diagnostic,
without failing the business action. Generate one ID/timestamp before fan-out;
each provider receives the same immutable envelope.

Context is captured at occurrence time. A login/logout before SDK loading must
not attribute old events to the current user. Applications define identity and
session messages as part of their own discriminated union when required. The
adapter must map them in provider FIFO order or use verified per-event identity
fields. Do not read mutable global user state when an old message is delivered.
The event-only Amplitude example does not implement authenticated identity or
user-property updates and must not be presented as covering them.

## Activation and independent queues

1. A committed source connection acquires the store-owned analytics runtime.
2. Install capture before publishing component mount facts. Initial suspended
   or abandoned render does not activate anything.
3. Source events are captured as detached input facts. Native state subscriptions
   observe value changes rather than every write. Each state projection remains
   independent and lazy while inactive. Emitting an initial snapshot is an
   explicit option and must distinguish snapshot from change.
4. Feature analysis transforms captured input into output messages. Apply
   enabled flags and routing before adding a provider queue entry.
5. Feature analysis is loaded after source activation as described above.
   The first accepted output message starts that provider's loader. An active component
   with no eligible messages does not load an SDK. Module loading is cached by
   the JS module system; runtime instances/queues are isolated per store/model.
6. Each provider owns its queue, loader, worker and failure state. No global
   Promise.all barrier and no rollback of already accepted events in other
   providers. Preserve handoff invocation order within one provider, not across providers.
   This does not guarantee server arrival order through an SDK or network.

Two Views of the same business model share one domain-event/state connection
for the same analytics target and connection definition. View lifetime and
View callback observations have separate per-instance identities. StrictMode
replay must not duplicate a logical mount message. Actual remount is a new
instance. A callback invocation is not automatically a successful business
fact or a physical pointer click; name messages according to what was observed.

Local React useState is not observable from outside a View. Expose an explicit
callback/fact or move observable state into atoms. Committed input props can be
projected through the lifecycle integration, using the same input-props
contract as lifecycle. There is no React-tree inspection or automatic prop capture.

## Three lifetimes

- **Capture:** source subscriptions exist while their last committed owner is
  active. They stop synchronously at the resource release boundary.
- **Drain:** already captured messages may finish after View unmount. A bounded
  worker lease keeps delivery alive; it does not keep observing the source or
  retaining the component/model. Remount can reuse the same provider queue.
- **SDK:** a loaded adapter can remain parked for the application/store lifetime,
  avoiding reinitialization and automatic session events on every View mount.
  Loading a JS module is not unloading it later. Actual SDK teardown is only
  promised when that SDK exposes a real supported operation.

Normal source release allows bounded drain. Disabling a provider stops new
capture for that provider and purges its unsent core queue. It does not start
an inactive SDK merely to disable it. An in-flight SDK call or dynamic import
cannot be assumed cancellable. Application shutdown stops all sources, applies
its explicit drain-or-discard policy and calls genuine adapter disposal when
available. Revocable/weak reporters prevent late SDK receipts retaining closed
stores or source models.

## Bounded buffering and errors

Proposed first-version defaults: 100 pending envelopes per provider, 30-second
age limit, drop oldest on overflow, no automatic core retry after ambiguous
handoff, and a 2-second explicit flush deadline. These are design defaults,
not measured production guarantees. Expose named options only for demonstrated
project needs.

- Queue bounds apply while loading and while waiting behind asynchronous writes.
  Include the currently executing core envelope in resource accounting.
- Deadlines apply to loading, asynchronous write, drain and flush. Timeout
  invalidates the worker generation and aborts its signal; it cannot stop
  unsupported SDK work. Ignore late success when deciding current runtime state.
- Emit structured diagnostics for overflow, expiry, disabled/shutdown discard,
  load failure, write failure and timeout. Do not store event payload histories
  in diagnostic atoms or retain unbounded arrays of errors.
- Loading failure affects one provider. A typed retry action can start a new
  generation; messages stay bounded and expire during failure. Do not replay
  an ambiguous write automatically: the SDK may already have accepted it.
- Filtering is not failure. Disabled providers collect no backlog for replay
  when re-enabled. A declared connection-level enabled flag can skip capture
  and feature loading entirely. Provider routing alone cannot skip input reads
  when eligibility depends on the lazy consumer's future output; do not promise
  that optimization without explicit routing metadata.
- Core queue bounds do not bound a third-party SDK's own offline/storage queue.
  Adapter documentation must state who owns retries, persistence and network
  backpressure. Exactly-once delivery is not a claim of this library.

## Adapter completion semantics

`write` completion means handoff at the adapter boundary. A synchronous SDK
with an internal queue returns immediately. An HTTP adapter may choose to
await its response. Neither is universally a server-ingestion acknowledgment.
Use separate diagnostics/receipts for a provider that exposes them.

Do not await one SDK's network receipt before enqueueing every next event if
that SDK is already designed to batch them. A failed async receipt is reported
without producing an unhandled rejection or retrying the business command.
`flush` completes a bounded attempt and returns per-provider outcomes. It does
not promise delivery just because a native flush promise resolved.

The core model should expose `publish`, per-provider retry/flush controls and
independent diagnostic atoms: `$status` (idle/loading/ready/error/closed),
`$pendingCount`, `$droppedCount`, `$lastError`. No SDK instance in public atoms,
no network Promise that would suspend a bound View, no large shared status
object forcing unrelated provider displays to update.

## Amplitude example and limits

`amplitude-adapter.ts` targets Browser SDK 2 and is deliberately event-only.
It uses a separate `createInstance`, awaits initialization, disables automatic
capture and remote overrides, maps envelope time/ID into `time`/`insert_id`,
and handles the SDK's track receipt without serializing all network uploads.

The public entry checked during this design exposes no shutdown method. Do not
invent one or call reset/setOptOut as a fake disposer: these alter identity or
persisted tracking behavior. SDK resources remain owned by the browser
application. This example sends no events unless an application explicitly
loads, initializes and invokes it with its own configuration.

Official references (checked 2026-10-27):

- [Browser SDK 2](https://www.amplitude.com/docs/sdks/analytics/browser/browser-sdk-2)
  documents initialization, instance creation, event options, receipts and flush.
- [SDK 2 migration](https://www.amplitude.com/docs/sdks/analytics/browser/migrate-from-browser-sdk-1-0-to-2-0)
  documents autocapture defaults and explicit disabling.
- [Public SDK entry](https://github.com/amplitude/Amplitude-TypeScript/blob/main/packages/analytics-browser/src/index.ts)
  lists its exposed methods.

## Reproduce the candidate adapter checks

Run `node scripts/check-analytics-design.mjs` from the repository root after
installing development dependencies. The script installs the SDK version pinned
in `validation.json` into an ignored `.vercel/analytics-probe` fixture, checks the
candidate against real SDK types and runs fake-SDK tests. It neither initializes
the real SDK nor sends analytics. These checks validate the adapter example,
not the still-unimplemented multi-provider runtime or connection lifecycle.

## Required experiments before release

- Declaration, pure reads, SSR and abandoned Suspense render load no SDK.
- First committed mount can capture an immediate lifecycle fact before import.
- Two Views share one domain subscription; StrictMode replay creates no duplicate.
- Four providers: slow load, failed load, rejected write and healthy provider
  coexist without blocking each other or the cart action.
- Identical consecutive payloads deliver twice; queued mutable input is detached.
- Provider filtering does not initialize unrelated SDKs. Inactive state selectors
  do not run. Initial snapshots and changes have different contracts.
- Rapid unmount before import preserves a permitted queued fact for bounded
  drain; an empty stopped connection does not initialize a late runtime.
- Queue overflow, expiry, hung loading/write and shutdown release core-owned
  resources and produce bounded diagnostics. A late resolution never revives
  an obsolete runtime.
- Two stores and two keyed source models do not share queues, identities or
  adapter instances. Native module caching may be shared; runtime state may not.
- Disabled-provider purge, re-enable without replay, login/logout ordering and
  stale identity snapshots behave as specified.
- SDK methods returning wrapper objects rather than Promises are handled, and
  SDK receipt failure is distinguished from successful handoff.
- Bundle fixtures prove core holo contains no analytics runtime or SDK, generic
  analytics contains no vendor SDK, and an inactive provider stays in a dynamic
  chunk. Retention tests distinguish core resources from native SDK resources.

## Adapter authoring

Use [adapter-prompt.md](./adapter-prompt.md) in another project. Supply that
project's analytics event/context contracts and the exact installed SDK version.
The prompt requires source verification, a runnable adapter and contract tests;
it must not copy imaginary lifecycle methods from a different SDK.

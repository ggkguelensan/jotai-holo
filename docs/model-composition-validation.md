# Model composition validation

Measurements in this report describe commit `fcecee6`. The current public model entry uses pipe and modifiers; the low-level registry constructor measured here is now internal. Re-run pnpm size for this checkout.

Checked on 2026-10-28 in `feat/model-composition`, based on `8f96d38`.
[Machine-readable measurements](./model-composition-validation.json) include
module lists, tooling and forced-GC results. Public contracts are in the
[runtime guide](runtime.md) and reference pages.

## Implemented structure

```text
Before
holo ── lifecycle callbacks
     ├─ resources
     └─ createModel ── keyed records + resource leases

After
holo ── read / write / committed input / imperative
     └─ models ── registry selection + shared ownership
                        ├─ returned bonds / persistence
                        ├─ data lifecycle
                        └─ analytics child ── lazy engine queues
```

Pure factories compose with `pipe`, `modelRegistry`, `modelLifecycle` and
`modelAnalytics`. Additional modifiers of an existing registry share its business
record and inherited connections. Applying a new registry defines a namespace.
Ownership caches use registry-entry identity, including when separate keys return
the same object. Retention and active observation remain separate.

`holo` accepts `view/models/read/write/props/input/imperative/onError`.
Raw lifecycle and resources fields are rejected. `createFormModel` returns a pure
factory: apply `modelRegistry` explicitly. The low-level createModel adapter
contract remains available for external effects.

## Validation

| Check                                | Result                                           |
| ------------------------------------ | ------------------------------------------------ |
| Unit contracts                       | 185 passing                                      |
| Ecosystem compatibility              | 17 passing                                       |
| Chromium bindings and examples       | 142 passing                                      |
| Packed ESM and consumer declarations | Passing                                          |
| React 18.0.0 / 18.3.1 / 19.3.1       | Development, production, SSR and types passing   |
| Documentation                        | EN / RU / DE / KK, 116 reference routes          |
| Amplitude adapter                    | Real SDK 2.48.1 types; fake runtime clients only |

Tests cover lazy declarations, native atom compatibility, independent projections,
no extra View render from analytics activation, repeated payloads, per-engine
mapping/failure/timeout/queue isolation, cached reconnect failures, partial rollback,
combined cleanup failures, first committed input with eager analytics, late imports,
key/store replacement, StrictMode, Suspense and native RHF resolvers/defaults.

Forced-GC experiments:

- Six composition cases × 300 cycles: discarded stores, eviction, pending feature
  import, pending data load, abandoned initial-data cycles and shared-record child
  eviction. Zero retained model/child records in each case.
- Registry/form cases × 300 cycles: zero retained discarded/removed records and
  released controls. Infinity intentionally retained 300 records until removal.
- Six production Chromium cases × 200 cycles: zero retained model records, atoms,
  callbacks and imperative handles; zero active connections/subscriptions.

These are bounded reproducible experiments, not a proof about every third-party
SDK or application loader.

## Bundle measurements

Equivalent production counters, Vite 8.0.13, React 19.3.1, Jotai 3.0.1, ES2022.
Values below are additional JavaScript over the same native React/Jotai counter.
Gzip level 9; sizes depend on the surrounding application.

| Counter fixture              | Minified bytes | Gzip bytes |
| ---------------------------- | -------------: | ---------: |
| Ordinary holo                |          5,994 |      2,284 |
| holo + helper atoms          |          6,184 |      2,349 |
| holo + direct input          |          6,040 |      2,299 |
| holo + imperative methods    |          6,845 |      2,538 |
| holo + low-level createModel |         10,150 |      3,680 |
| holo + pipe/modelRegistry    |         11,818 |      4,198 |

Ordinary holo was +2,422 gzip bytes at the migration baseline; it is now
+2,284 bytes, a reduction of 138 bytes. Analytics, data lifecycle, registry,
Query, RHF, persistence and vendor implementations are absent from that fixture.

Separate optional-export fixtures keep peers external. They measure full exported
code rather than an increment over a project already using shared infrastructure:

| Exports                               | Gzip bytes |
| ------------------------------------- | ---------: |
| modelRegistry + pipe + modelRegistry  |      2,539 |
| createAnalytics + modelAnalytics      |      4,876 |
| createAmplitudeAdapter, no SDK import |        210 |

These values are not additive. The generic analytics entry includes shared bond,
registry and ownership code; it imports no analytics SDK. The search example emits
feature-specific mappings into a separate dynamic chunk.

## Explicit limits

Dynamic analytics capture starts after its factory loads; earlier facts are not
replayed using a later state. For essential initial facts, use the synchronous
form `modelAnalytics(() => createSearchAnalyticsModel)`. Child layout effects can
precede the parent's acquisition and are not guaranteed capture points.

Dirty data saves start after release. Await `flush` before intentional removal
when durability matters. Finite retention does not wait for background saves;
cross-generation server writes need application concurrency/versioning policy.
A transport that ignores AbortSignal can continue after a library deadline.

Engine queues bound the library's pending messages, not an SDK's own offline
storage or retries. Flush is a best-effort handoff/SDK flush, not a server-ingestion
or exactly-once guarantee. Source release allows bounded drain; explicit analytics
dispose closes the store runtime. No real analytics were sent during validation.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:package
pnpm test:react
pnpm test:composition-memory
pnpm test:model-memory
pnpm test:memory
pnpm test:analytics-adapter
pnpm docs:check
pnpm docs:build
pnpm test:docs
pnpm size
```

Production docs retain the existing bundler warnings about client directives and
sourcemap reporting; builds and browser smoke pass. No circular module/chunk
warnings remain between the registry implementation and modifier entry point.

# Runtime implementation validation

Checked on 2026-10-27. Migration baseline: 84002f0 (feat/holo-runtime).

## Implemented

- Named model selections with default, structural keys and store isolation.
- Only view/read/write/props/models/lifecycle configuration; retired aliases and binding runtimes removed.
- Stable committed imperative methods through useImperativeHolo.
- Event/action argument delivery, current store, no replay and error reporting.
- Lifecycle input selection, logical StrictMode ownership and Suspense retention.
- Shared transactional resource acquisition and reverse cleanup.
- retainTime and resources, including form retention; retired model options rejected.
- Native stateAtom alias, including writable derivations and async read options.
- Optional persistence with codecs, localStorage, sequential writes and timeouts.
- Four-language imperative documentation and an executable checkout example.

## Validation

| Command                | Result                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm check             | Formatting, build, types, 160 unit tests, 17 ecosystem tests, 134 browser tests and example build passed                                                   |
| pnpm test:react        | Packed consumer types and development/production runs on React 18.0.0, 18.3.1 and 19.3.1 passed                                                            |
| pnpm test:package      | ESM exports, persistence entry, declarations and client directives passed                                                                                  |
| pnpm docs:check        | Strict Lingui catalogs, four locales, source blocks and links passed                                                                                       |
| pnpm docs:build        | Production site built; Vite reports ignored client directives for its own client/server bundles                                                            |
| pnpm test:docs         | 96 reference routes, localized checkout actions and existing live examples passed                                                                          |
| pnpm test:memory       | Production Chromium forced GC: 200 cycles per case; no retained models, atoms, callbacks or imperative handles in keyed, pending and discarded-store cases |
| pnpm test:model-memory | 300 cycles per case; released instances and discarded stores collected; Infinity retention and explicit removal verified                                   |
| pnpm size              | Optional infrastructure stays outside ordinary holo imports                                                                                                |

Size results are fixture measurements, not universal application costs. In the same existing React/Jotai counter application, ordinary holo adds **2,422 gzip bytes**, compared with 3,750 before removing the parallel compatibility runtime.

| Counter fixture               | Added gzip bytes over native React/Jotai |
| ----------------------------- | ---------------------------------------: |
| holo                          |                                    2,422 |
| holo with helper atoms        |                                    2,507 |
| holo with lifecycle callbacks |                                    2,451 |
| holo with imperative methods  |                                    2,691 |
| holo with named models        |                                    3,642 |

The isolated useImperativeHolo export is 345 gzip bytes with peers external; persistence plus localStorageAdapter is 1,268 gzip bytes with peers external. Compression deltas are not additive. Ordinary holo excludes the model registry, Query, RHF, persistence and retired adapter modules.

## Remaining design work

The multi-provider analytics runtime, lazy feature consumers, committed-input observer bridge, built-in IndexedDB adapter and application-wide asynchronous shutdown are not implemented by this change. The existing Query/Mutation/RHF integrations remain in place. Resource cleanup is synchronous; it does not certify completion of external asynchronous work. Analytics design artifacts are proposals, not published exports.

The runtime guide documents current limitations, including keyed View remounts, explicit selector input annotations, per-View imperative delivery and synchronous lifecycle/restore handlers.

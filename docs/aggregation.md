# Binding snapshots

All bindings use one implementation: a fixed chain of public Jotai raw atom hooks. The chain is built when a binding is declared; render does not conditionally loop over hooks.

```text
Named selections → resolved models → selected atoms
                                         ↓
                                useAtomValueRaw
                                         ↓
                           store-owned weak snapshot cache
                            ↙                         ↘
                    resolved props             stable pending Promise
                            ↘                         ↙
                                      View
```

Native hooks preserve Jotai continuable promises, including source replacement before first commit. The cache preserves pending result identity across Suspense retries. Fulfilled sources beside changed synchronous values return synchronous props. Any rejected source reaches ErrorBoundary without waiting for a never-settling sibling.

Caches are weakly keyed by store and atom references. Pending promise handlers capture only promise status, not models or store registries. This avoids a globally mounted atom retaining discarded per-model graphs through a pending aggregate dependency.

The SSR regression with an async model and an async field is covered by holo-view.test.tsx. Browser aggregation, model-async and rendering suites cover stale requests, falsy values, rejection, replacement and commit counts. Production Chromium forced-GC tests cover mounted, abandoned and discarded-store models and imperative handles.

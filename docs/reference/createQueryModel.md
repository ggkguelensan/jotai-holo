# createQueryModel

Expose server data to atom workflows through independent projections. Use this adapter when atoms or models need reactive Query results; a React-only consumer can keep native Query hooks.

Read the [TanStack Query overview](/overview/tanstack-query) for the complete workflow and live examples.

## Installation

Optional entry: `jotai-holo/query`. Requires `@tanstack/query-core` v5. Use the same version as your application's TanStack Query.

## Contract

`createQueryModel({ state?, query, prism, client? }) → named read-only atoms`

- `state` accepts the same native atom, tuple, or record inputs as ion. All declared inputs are read when options are needed. The query factory receives their values.
- `query` returns complete native QueryObserverOptions. Pass your `productDetailQO(params)` factory result unchanged. Keep keys, query functions, retries, and resource defaults in that factory. No Query Kit runtime is required.
- `prism` is an **object of independent selectors**. Unread selectors never execute. Equal selected results do not notify consumers, even if isFetching changes elsewhere in the result. A callback returning all fields is deliberately unsupported.
- `client` is your QueryClient or an atom containing it. Otherwise initialize [queryClientAtom](/reference/queryClientAtom) in the application's store. There is no hidden client. Share it with QueryClientProvider for native useQuery interoperability, and manage its application mount/unmount there.
- Declaration creates no observer. A read may create an observer and query-cache entry but does not subscribe or fetch. First mounted projection subscribes; sibling projections share it. Last unsubscribe removes the observer from the query; query-core owns cancellation and cache gcTime. Remount rebinds before subscribing, including after the query-cache entry expires.
- Runtime state belongs to the Jotai store/client pair. Key/client changes move subscriptions; stale queued callbacks are ignored after unsubscribe. Different stores can share a QueryClient intentionally and still have separate observers.
- `enabled`, skipToken, initialData, placeholderData, select, retry, AbortSignal, and ordinary query options retain query-core semantics. Errors are values by default; throwOnError opts into throwing. Async promises are **not** synthesized for Suspense. This is an ordinary QueryObserver adapter, not useSuspenseQuery, infinite queries, or a mutation wrapper.
- Unmounted atom reads are cached by Jotai and are not a live imperative cache subscription. Use QueryClient.getQueryData for fresh imperative reads. Mount reconciles the snapshot.

Explicit notifyOnChangeProps also limits native observer notifications. Avoid restrictive lists if your projections read other result fields.

The example derives `$screen` directly in `prism` and selects a View with `holoMatch`. Initial loading uses `isPending`; background fetching keeps the ready branch visible. A successful `null` result selects the empty branch. Data and error bindings subscribe only while their branch is mounted. The screen atom does not narrow the separate data atom's TypeScript type, so CardView still checks for missing data.

## Independent models

Declare createQueryModel outside defineModel. Compose cross-model connections separately from the business factory. The current adapter exposes read-only atom projections; it does not publish an event for every completed request. A projected value change and a request-completion fact have different semantics.

## Why this API

Prefer native useQuery or useSuspenseQuery with a local select when React alone consumes the data. This remains valid even when another model already uses createQueryModel with the same QueryClient. Use this adapter for atom-graph dependencies; binding its projections through holo is optional. Independent projections reuse prism. The adapter talks directly to QueryObserver without replacing Query's cache or network lifecycle.

## Analogies and reading

- [Query Kit](https://github.com/ggkguelensan/tanstack-query-kit) — resource options factories reused without consumer key duplication.
- [TanStack render optimizations](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations) — structural sharing, select, and tracked properties in useQuery.
- [Jotai Query integration](https://jotai.org/docs/extensions/query) — atomWithQuery is a good alternative when one result atom is sufficient.
- [QueryObserver](https://tanstack.com/query/latest/docs/reference/QueryObserver) — native subscription lifecycle.

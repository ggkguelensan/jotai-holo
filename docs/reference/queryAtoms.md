# queryAtoms

Bind Query results to a View through separate atoms. Reuse your query-options factory and select only the fields each View needs.

<Demo kind="query">

<<< @/../examples/docs/query.tsx#query

</Demo>

## Installation

Optional entry: `jotai-holo/query`. Requires `@tanstack/query-core` v5. Use the same version as your application's TanStack Query.

## Contract

`queryAtoms({ state?, query, prism, client? }) → named read-only atoms`

- `state` accepts the same native atom, tuple, or record inputs as ion. All declared inputs are read when options are needed. The query factory receives their values.
- `query` returns complete native QueryObserverOptions. Pass your `productDetailQO(params)` factory result unchanged. Keep keys, query functions, retries, and resource defaults in that factory. No Query Kit runtime is required.
- `prism` is an **object of independent selectors**. Unread selectors never execute. Equal selected results do not notify consumers, even if isFetching changes elsewhere in the result. A callback returning all fields is deliberately unsupported.
- `client` is your QueryClient or an atom containing it. Otherwise initialize [queryClientAtom](/reference/queryClientAtom) in the application's store. There is no hidden client. Share it with QueryClientProvider for native useQuery interoperability, and manage its application mount/unmount there.
- Declaration creates no observer. A read may create an observer and query-cache entry but does not subscribe or fetch. First mounted projection subscribes; sibling projections share it. Last unsubscribe removes the observer from the query; query-core owns cancellation and cache gcTime. Remount rebinds before subscribing, including after the query-cache entry expires.
- Runtime state belongs to the Jotai store/client pair. Key/client changes move subscriptions; stale queued callbacks are ignored after unsubscribe. Different stores can share a QueryClient intentionally and still have separate observers.
- `enabled`, skipToken, initialData, placeholderData, select, retry, AbortSignal, and ordinary query options retain query-core semantics. Errors are values by default; throwOnError opts into throwing. Async promises are **not** synthesized for Suspense. This is an ordinary QueryObserver adapter, not useSuspenseQuery, infinite queries, or a mutation wrapper.
- Unmounted atom reads are cached by Jotai and are not a live imperative cache subscription. Use QueryClient.getQueryData for fresh imperative reads. Mount reconciles the snapshot.

Explicit notifyOnChangeProps also limits native observer notifications. Avoid restrictive lists if your projections read other result fields.

## Why this API

Native useQuery's property tracking works well in hook-based components. Holo needs named atoms to bind a plain View. Independent projections reuse prism and let data-only Views ignore fetching changes. This adapter talks directly to QueryObserver; it does not wrap atomWithQuery or replace Query's cache, network lifecycle, or mutation infrastructure.

## Analogies and reading

- [Query Kit](https://github.com/ggkguelensan/tanstack-query-kit) — resource options factories reused without consumer key duplication.
- [TanStack render optimizations](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations) — structural sharing, select, and tracked properties in useQuery.
- [Jotai Query integration](https://jotai.org/docs/extensions/query) — atomWithQuery is a good alternative when one result atom is sufficient.
- [QueryObserver](https://tanstack.com/query/latest/docs/reference/QueryObserver) — native subscription lifecycle.

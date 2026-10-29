# createQueryModel

Expose server data to atom workflows through independent projections. Use this adapter when atoms or models need reactive Query results; a React-only consumer can keep native Query hooks.

## Installation

Optional entry: `jotai-holo/query`. Requires `@tanstack/query-core` v5. Use the same version as your application's TanStack Query.

## Usage

Keep the query key and fetch operation in a native options factory. Then expose
only the fields needed by the atom graph:

```ts
import { QueryClient, queryOptions } from '@tanstack/react-query';
import { createQueryModel } from 'jotai-holo/query';

type Game = { id: string; name: string };

const gameDetailQO = (id: string) =>
  queryOptions({
    queryKey: ['game', id],
    queryFn: async ({ signal }): Promise<Game> => {
      const response = await fetch(`/api/games/${id}`, { signal });
      if (!response.ok) throw new Error('Could not load the game');
      return response.json();
    },
  });

const client = new QueryClient();

const $$gameQuery = createQueryModel({
  client,
  query: () => gameDetailQO('P-1042'),
  prism: {
    $game: (result) => result.data,
    $pending: (result) => result.isPending,
    $error: (result) => result.error,
  },
});
```

The endpoint is application code; replace it with your API. Mounting a consumer
of these atoms starts observation. Pass this same `client` to your application's
`QueryClientProvider` for cache sharing with native hooks. An application can
instead inject its existing client through [queryClientAtom](/reference/queryClientAtom).

## Contract

`createQueryModel({ state?, query, prism, client? }) → named read-only atoms`

### Options and projections

- `state` accepts the same native atom, tuple, or record inputs as ion. All declared inputs are read when options are needed. The query factory receives their values.
- `query` returns complete native QueryObserverOptions. Pass your `gameDetailQO(params)` factory result unchanged. Keep keys, query functions, retries, and resource defaults in that factory. No Query Kit runtime is required.
- `prism` is an **object of independent selectors**. Unread selectors never execute. Equal selected results do not notify consumers, even if isFetching changes elsewhere in the result. A callback returning all fields is deliberately unsupported.
- `client` is your QueryClient or an atom containing it. Otherwise initialize [queryClientAtom](/reference/queryClientAtom) in the application's store. There is no hidden client. Share it with QueryClientProvider for native useQuery interoperability, and manage its application mount/unmount there.

### Reading and subscribing

Declaration creates no observer. A read may create an observer and query-cache entry but does not subscribe or fetch. The first mounted projection subscribes; sibling projections share that observer. The last unsubscribe removes it from the query. Query-core owns cancellation and cache `gcTime`. Remount rebinds before subscribing, including after the cache entry expires.

Runtime state belongs to the model/store/client combination. Key or client changes move subscriptions; callbacks left over from a released subscription are ignored. Different stores can intentionally share a QueryClient and still have separate observers.

An unmounted atom read uses Jotai's cached result; it is not a live imperative cache subscription. Use `QueryClient.getQueryData` for fresh imperative reads. Mounting a projection reconciles its snapshot.

### Native options and errors

`enabled`, `skipToken`, `initialData`, `placeholderData`, `select`, `retry`, `AbortSignal` and ordinary query options retain query-core semantics. Errors are values by default; `throwOnError` opts into throwing.

The adapter does not create Promises for Suspense. Use native `useSuspenseQuery` when the UI needs that contract. Infinite queries and mutations need their own APIs.

Explicit notifyOnChangeProps also limits native observer notifications. Avoid restrictive lists if your projections read other result fields.

The [game catalog example](/examples/game-catalog) derives `$screen` in `prism` and selects a View with `holoMatch`. Initial loading uses `isPending`; background fetching keeps the ready branch visible. A successful `null` result selects the empty branch. The screen atom does not narrow a separate data atom's TypeScript type, so the data View still checks for missing data.

## Independent models

Declare createQueryModel outside defineModel. Compose cross-model connections separately from the business factory. The current adapter exposes read-only atom projections; it does not publish an event for every completed request. A projected value change and a request-completion fact have different semantics.

## Why this API

Prefer native useQuery or useSuspenseQuery with a local select when React alone consumes the data. This remains valid even when another model already uses createQueryModel with the same QueryClient. Use this adapter for atom-graph dependencies; binding its projections through holo is optional. Independent projections reuse prism. The adapter talks directly to QueryObserver without replacing Query's cache or network lifecycle.

## Analogies and reading

- [Query Kit](https://github.com/ggkguelensan/tanstack-query-kit) — resource options factories reused without consumer key duplication.
- [TanStack render optimizations](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations) — structural sharing, select, and tracked properties in useQuery.
- [Jotai Query integration](https://jotai.org/docs/extensions/query) — atomWithQuery is a good alternative when one result atom is sufficient.
- [QueryObserver](https://tanstack.com/query/latest/docs/reference/QueryObserver) — native subscription lifecycle.

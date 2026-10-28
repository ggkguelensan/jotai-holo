# TanStack Query

[Try the product catalog](/examples/product-catalog) or [proposal discounts](/examples/proposal-discount).

## createQueryModel

Expose server data to atom workflows through independent projections. Use this adapter when atoms or models need reactive Query results; a React-only consumer can keep native Query hooks.

Prefer native useQuery or useSuspenseQuery with a local select when React alone consumes the data. This remains valid even when another model already uses createQueryModel with the same QueryClient. Use this adapter for atom-graph dependencies; binding its projections through holo is optional. Independent projections reuse prism. The adapter talks directly to QueryObserver without replacing Query's cache or network lifecycle.

## createMutationModel

Save a proposal from a Jotai action and display pending, success, and error states through separate atoms. This local simulation rejects discounts above 25%; no network request is sent.

Use native useMutation when React owns the operation. Use createMutationModel only when the atom/model system needs to execute the mutation or react to its state. Several UI consumers alone do not require an atom adapter. Existing createMutationModel does not prevent native hooks elsewhere; shared mutation keys do not share an observer or execution state.

atomWithMutation already integrates Jotai with TanStack. Our interface exposes a writable action directly and named projections instead of requiring callers to read a result atom to find mutate. This also makes it usable in holo.write and bond.write. Observing all mutations, including those launched by useMutation, is a separate cache-level task.

## queryClientAtom

Give Jotai bindings the same QueryClient as the rest of the application. This lets `createQueryModel` and native `useQuery` share one cache.

```ts
import { QueryClient } from '@tanstack/react-query';
import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
const client = new QueryClient();
const store = createStore();
store.set(queryClientAtom, client);
// Use the same client in QueryClientProvider and this store in Jotai Provider.
```

Explicit client ownership preserves hydration and cache sharing with native React Query. An explicit createQueryModel client is useful for a self-contained widget; this atom is useful for application-level configuration.

## API reference

- [createQueryModel](/reference/createQueryModel)
- [createMutationModel](/reference/createMutationModel)
- [queryClientAtom](/reference/queryClientAtom)

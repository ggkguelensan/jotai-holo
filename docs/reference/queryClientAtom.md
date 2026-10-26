# queryClientAtom

Inject the application's QueryClient into a Jotai store.

<Demo kind="query">

<<< @/../examples/docs-infrastructure.tsx#query

</Demo>

```ts
import { QueryClient } from '@tanstack/react-query';
import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
const client = new QueryClient();
const store = createStore();
store.set(queryClientAtom, client);
// Use the same client in QueryClientProvider and this store in Jotai Provider.
```

## Contract

A native writable `Atom<QueryClient | null>`, initially null. Query bindings without an explicit client throw a descriptive error if it is missing. Replacing it moves mounted query subscriptions. Create a fresh client/store pair per SSR request. Injection alone does not mount the client or fetch queries.

## Why this API

Explicit client ownership preserves hydration and cache sharing with native React Query. An explicit queryAtoms client is useful for a self-contained widget; this atom is useful for application-level configuration.

## Analogies and reading

- [QueryClientProvider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider) — native client ownership.
- [Jotai hydration](https://jotai.org/docs/utilities/ssr) — hydrate values into the request store.

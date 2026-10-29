# TanStack Query

A player profile editor needs server values to seed its business model, then a mutation to save the draft. QueryClient owns the server cache. The business model owns editing decisions. Query and mutation models let the atom graph participate in that workflow.

[Try the game catalog](/examples/game-catalog) or follow the complete [profile workflow](/recipes/profile-composition).

## Read server data in the atom graph {#createquerymodel}

Start with reusable TanStack options factories. The same options can serve native hooks and atom consumers.

<<< @/../examples/profile/profile-composition.ts#profile-options

Expose only the Query results the model needs. Each `prism` field is a separate projection: a consumer of the profile does not subscribe to the error field.

<<< @/../examples/profile/profile-composition.ts#profile-query

The profile projection rejects placeholder data because it will initialize an editable draft. That is a decision for this workflow, not a requirement for every Query projection.

Creating the declaration does not fetch. A mounted consumer activates the Query observer. The [profile recipe](/recipes/profile-composition#use-existing-data-before-loading) shows how a managed connection reads this source only while the selected business model is empty. Once initialized, background refetches do not replace its draft.

## Save through a mutation {#createmutationmodel}

The mutation's `mutate` atom returns that call's Promise. An action can await it and publish a domain fact after success:

<<< @/../examples/profile/profile-composition.ts#profile-save

`profileSaved` is our application's event. It is not an adapter lifecycle event. The save action also rejects a second submission while pending; applications that allow concurrent saves need their own reconciliation policy.

Mutation projections describe the most recently started call, while each returned Promise belongs to its own call. Reusing a `mutationKey` does not merge separate mutation models' execution state.

## Share one QueryClient {#queryclientatom}

```ts
import { QueryClient } from '@tanstack/react-query';
import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';

const client = new QueryClient();
const store = createStore();
store.set(queryClientAtom, client);
```

Pass this client to `QueryClientProvider` and this store to Jotai's `Provider`. Native hooks and atom consumers then use the same cache, including hydration and invalidation.

## Keep native hooks for View-only data

Use `useQuery` or `useSuspenseQuery` with a local `select` when only React needs the result. This remains useful even if an atom consumer already uses the same query. Native hooks keep their Suspense and error-boundary behavior; Query projections do not automatically turn loading into Suspense.

Likewise, keep `useMutation` when the View alone owns the operation. Add an adapter when atoms or models need to execute it or observe its state. A model registry is for a feature's editing instances, not a second Query cache.

## API reference

- [createQueryModel](/reference/createQueryModel)
- [createMutationModel](/reference/createMutationModel)
- [queryClientAtom](/reference/queryClientAtom)

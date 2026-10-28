# mutationAtoms

Save a proposal from a Jotai action and display pending, success, and error states through separate atoms. This local simulation rejects discounts above 25%; no network request is sent.

<Demo kind="mutation">

<<< @/../examples/docs/mutation.tsx#mutation

</Demo>

## Installation

Optional entry: `jotai-holo/query`. Requires `@tanstack/query-core` v5. Share your application's QueryClient through [queryClientAtom](/reference/queryClientAtom), or provide a client explicitly.

## Contract

`mutationAtoms({ mutation, prism?, client? }) → { mutate, reset, ...projections }`

- `mutation` is a native mutation-options factory. It runs once per initialized store/client pair, not on every render or invocation. Variables carry changing business inputs; use actionAtom or bond to collect current atom values.
- `mutate` is an actionAtom accepting the factory's variables and returning its native execution Promise. Void and optional variables can be omitted. Each invocation executes independently, including without React or mounted projections.
- `reset` is an actionAtom without arguments. It returns observed state to idle without cancelling requests or changing their Promises. A reset call's previous execution cannot restore its old state.
- `prism` is optional and contains independent selectors. Each result is a read-only atom. Unread selectors never execute; unchanged selected values do not notify consumers. New objects still count as changed values. The names mutate and reset are reserved.
- Selectors receive native mutation state and status flags, without the mutate/reset methods. Status narrowing preserves data/error types. Reads never execute a mutation, suspend, or automatically throw its error.

### Execution and errors

Await the returned Promise to continue after this particular call. An error projection is a value for the UI; it does not handle a rejected Promise. After awaiting a call, unmounted reads see its completed state unless a newer call or reset superseded it.

```tsx
const save = actionAtom(async (_get, set, input: ProposalInput) => {
  const proposal = await set(saving.mutate, input);

  set(proposalSaved, proposal);
  return proposal;
});
```

In bond.trigger, mutate signals invocation with its input arguments, not successful completion. Publish a domain fact after await when completion matters. Per-call callback options are deliberately unsupported; use the Promise instead.

### Parallel calls and reset

Projections describe the latest started call. Every call keeps its own Promise. If the second call completes before the first, pending becomes false and the second result remains visible after the first finishes. Pending is not an aggregate count of unfinished saves.

Reset clears observed data, error, and variables. Already started requests and native options callbacks continue. New calls observe new executions; old completions cannot overwrite their state.

### Ownership and isolation

Mounted projections share one observer subscription. Active calls retain it even without UI subscribers. The last owner releases it. Late subscribers read current state, including a save completed after unmount. Declaration itself creates no observer or subscription.

Runtime belongs to the store/client pair. The same adapter in one store shares state; separate stores or separate adapters have independent state even with a shared client. Client changes route new calls to the new client; old calls finish in their original client. Returning to an earlier client restores its runtime state.

TanStack owns the mutation cache and gcTime. The adapter retains its latest result while its runtime is reachable, without accumulating call history. Unmount does not cancel writes. The application owns QueryClient mounting and disposal, including online resumption.

### Native options

Client/key defaults, retry, networkMode, paused state, scope serialization, meta, optimistic updates, rollback, and native options callbacks retain query-core behavior. Async callbacks are awaited by TanStack; the adapter never invokes them again. Query-cache updates remain visible to native useQuery and queryModel using the same client.

React-only throwOnError is unsupported. Enabled values, including inherited client defaults, fail explicitly during runtime initialization. Native factory types may widen this option, so validation occurs at runtime. Catch execution errors or read an error projection. Per-call mutate callbacks, cancellation, and automatic query invalidation are not added.

## Why this API

Use native useMutation when React owns the operation. Use mutationAtoms only when the atom/model system needs to execute the mutation or react to its state. Several UI consumers alone do not require an atom adapter. Existing mutationAtoms does not prevent native hooks elsewhere; shared mutation keys do not share an observer or execution state.

atomWithMutation already integrates Jotai with TanStack. Our interface exposes a writable action directly and named projections instead of requiring callers to read a result atom to find mutate. This also makes it usable in holo.write and bond.write. Observing all mutations, including those launched by useMutation, is a separate cache-level task.

## Analogies and reading

- [TanStack mutation options](https://tanstack.com/query/latest/docs/framework/react/reference/mutationOptions) — reuse native option factories.
- [TanStack mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) — execution, callbacks, optimistic updates, and consecutive calls.
- [MutationObserver](https://tanstack.com/query/latest/docs/framework/react/reference/classes/MutationObserver) — the underlying executor and observed state.
- [useMutationState](https://tanstack.com/query/latest/docs/framework/react/reference/useMutationState) — observing multiple mutation-cache entries.
- [Jotai Query](https://jotai.org/docs/extensions/query) — atomWithMutation and atomWithMutationState alternatives.

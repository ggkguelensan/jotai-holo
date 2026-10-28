# holoMatch and holoList

## holoList

Render a View for each item in an array atom. Stable keys keep row state attached to the right item when the list is reordered.

<Demo kind="list">

<<< @/../examples/docs/list.tsx#list

</Demo>

Reflect-like list binding is a UI composition helper. getKey is required because row identity should be deliberate. Jotai splitAtom solves a different problem: deriving item atoms, including writable per-item operations. Use splitAtom when that model is needed, then bind/render it explicitly.

## holoMatch

Choose a View from a status atom. For example, show loading, content or an error while keeping inactive branches unmounted.

<Demo kind="match">

<<< @/../examples/docs/match.tsx#match

</Demo>

This turns state-to-View selection into a reusable declaration with explicit exhaustiveness. An ordinary switch or conditional JSX remains clearer for one local branch. ion can derive a compact status key; no separate match scheduler is needed.

## Rendering and async

Read [Rendering and async](/guide/rendering) for subscription boundaries, Suspense and model ownership.

## API reference

- [holoList](/reference/holoList)
- [holoMatch](/reference/holoMatch)

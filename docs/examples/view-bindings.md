# Small Views and committed inputs

## Compose the connected children

The reward panel is a layout. It does not read atoms or forward their values: Count, Doubled and CounterControls each have their own binding.

<Demo kind="counter" :files="['counter-views.tsx']">

<<< @/../examples/docs/counter.tsx#counter-layout

</Demo>

### Read only what the View displays

CountView receives the balance; DoubledView receives the calculated bonus. Their markup is ordinary React. These are their complete input contracts:

<<< @/../examples/docs/counter-views.tsx#counter-read-contracts

<<< @/../examples/docs/counter.tsx#counter-read

### Bind commands at the controls

The controls receive one callback and subscribe to no state. They do not receive the balance just because the neighboring display needs it.

<<< @/../examples/docs/counter-views.tsx#counter-write-contract

<<< @/../examples/docs/counter.tsx#counter-write

The shared atoms hold the balance and bonus calculation. The command keeps the balance nonnegative:

<<< @/../examples/docs/counter.tsx#counter-state

## Forward a committed parent input

The parent keeps its local search term and visibility in React. Small field Views edit those props. Search forwards the term to an atom after commit; Status independently reads that atom. Hiding Search stops forwarding new inputs without removing the last committed query.

<Demo kind="input" :files="['input-views.tsx']">

<<< @/../examples/docs/input.tsx#input-layout

</Demo>

The connected Views need only these props:

<<< @/../examples/docs/input-views.tsx#input-contracts

<<< @/../examples/docs/input.tsx#input-bindings

Change the term, hide Search, then edit the term again. The parent field changes, but the atom-backed output keeps its previous value. Show Search again to forward the latest committed term. The full source includes the small native field Views; they need no holo binding for parent-owned React state.

## Continue reading

- [How it works](/topics/holo)
- [API reference](/reference/holo)

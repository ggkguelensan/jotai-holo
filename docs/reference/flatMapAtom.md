# flatMapAtom

Follow an atom selected from another atom’s value. Use this for an atom inside a selected model or a target chosen by an address.

<<< @/../examples/spreadsheet/models/view-model.ts#editor-routing

## Contract

`flatMapAtom(atom | record | tuple, select) → Atom | WritableAtom`

The selector receives source values and returns an existing atom. Reading follows that atom; changing the sources replaces the target dependency. Target-only changes do not rerun the selector. All declared sources are read when selection is recomputed.

A writable target preserves its write arguments and return value. Each write resolves the current target in the current store, even without a subscription. Read-only targets produce a read-only TypeScript interface; JavaScript writes to a read-only target throw. Mixed or incompatible target types do not gain write access.

Return stable atoms. Creating a new stateAtom inside the selector can replace state when sources change. Selection does not acquire model ownership or activate holo connections. Native Jotai subscriptions still mount selected dependencies normally. Promise values and thrown errors or Promises are forwarded without automatic awaiting.

## Why this API

Use [ion](/reference/ion) to project values, [matchAtom](/reference/matchAtom) for a table of branches, and stateAtom for arbitrary dynamic reads. flatMapAtom does not forward event-channel metadata; use the original event as a bond trigger.

## Analogies and reading

- [Jotai: composing atoms](https://jotai.org/docs/guides/composing-atoms) — native derived reads and forwarded writes.

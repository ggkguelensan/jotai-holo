# prism

Split one source into named, independent read-only projections. Import from the root or vanilla entry.

<Demo kind="prism">

<<< @/../examples/docs/prism.tsx#prism

</Demo>

<<< @/../examples/documentation.tsx#prism

## Contract

`prism(sourceAtom, { outputName: selector, … }) → { outputName: Atom, … }`

- Each output is a separate native derived atom; declaring the map runs no selector.
- Reading one output does not execute unused selectors. Subscribed outputs recompute when the source changes; unchanged selected values do not notify consumers.
- Multiple consumers share each output's Jotai cache within one store. Different stores remain isolated.
- There is no deep equality or per-property proxy tracking. Returning a fresh object can notify on every source change; preserve structural sharing or use selectAtom with a deliberate equality function.
- `undefined` remains undefined. Errors propagate; Promise selectors remain Promise-valued, and started async work is not automatically cancelled.

## Why this API

Prism is a declaration convenience for several native derivations, not a global splitter that eagerly computes every field. Use selectAtom for custom slice equality, or optics when you need writable lenses rather than read-only projections.

## Analogies and reading

- [Patronum reshape](https://patronum.effector.dev/operators/reshape/) — the named one-to-many projection analogy. Prism keeps native undefined and Promise semantics.
- [Jotai selectAtom](https://jotai.org/docs/utilities/select) — the alternative when comparison needs to be customized.
- [Jotai performance](https://jotai.org/docs/guides/performance) — why stable selections and small subscription boundaries matter.

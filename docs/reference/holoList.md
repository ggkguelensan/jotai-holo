# holoList

Render a View for each item in an array atom. Stable keys keep row state attached to the right item when the list is reordered.

<Demo kind="list">

<<< @/../examples/docs/list.tsx#list

</Demo>

<<< @/../examples/documentation.tsx#list

## Contract

Requires source, core, getKey and mapItem. Supports the ordinary holo sections state/actions/bindProps/cage plus optional empty View. Source may contain a Promise; use Suspense/error boundaries.

mapItem returns ordinary row props, not atom bindings, and may not overlap bound sections. Remaining required row props are public props of the list and are also passed to the empty View. Empty source creates no rows and therefore no row state subscriptions.

Stable unique keys preserve row identity on reorder. Duplicate stringified keys throw. A new source array runs mapping for all rows; rows whose props remain shallow-equal can skip View rendering. Each row has its own cage and subscriptions; removing it disposes them. Shared state bindings can update every row.

There is no virtualization, automatic per-item atom creation or automatic binding of atom-valued mapItem results. For large lists, combine appropriate data structures with an external virtualizer.

## Why this API

Reflect-like list binding is a UI composition helper. getKey is required because row identity should be deliberate. Jotai splitAtom solves a different problem: deriving item atoms, including writable per-item operations. Use splitAtom when that model is needed, then bind/render it explicitly.

## Analogies and reading

- [Reflect list](https://reflect.effector.dev/docs/list) — the source-to-row binding analogy.
- [Jotai splitAtom](https://jotai.org/docs/utilities/split) — item atom derivation rather than a rendering adapter.
- [Jotai performance](https://jotai.org/docs/guides/performance) — why stable selections and small subscription boundaries matter.

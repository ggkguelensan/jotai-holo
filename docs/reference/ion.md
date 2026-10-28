# ion

Calculate one value from several atoms. In the cart below, quantity and discount determine the total.

<Demo kind="ion">

<<< @/../examples/docs/ion.tsx#ion

</Demo>

<<< @/../examples/documentation.tsx#ion

## Contract

`ion(atom | record | tuple, project?) → Atom`

Without project, the output mirrors the source shape. With project, it holds the returned value. Single atoms, named records and tuples are supported. Inputs may be native atoms or wrapper-created atoms.

All declared inputs are read on each required recomputation, even when a projector branch uses only one field. For conditional dependencies use stateAtom(get => …) or native atom. Projectors are lazy and pure; Object.is governs output notifications. Promise inputs remain raw Promises: an async projector must await explicitly.

## Why this API

Use ion when you can list the inputs at declaration time. The result has Jotai's normal caching and equality rules. A projector that returns a new object changes the result's identity.

## Analogies and reading

- [Effector combine](https://effector.dev/en/api/effector/combine/) — the shape-and-projector analogy; scheduling remains native Jotai.
- [Jotai atom](https://jotai.org/docs/core/atom) — the underlying primitive/read-only/write-only contracts.

- [Jotai: Composing atoms](https://jotai.org/docs/guides/composing-atoms) — explains the native derived/action composition patterns this small helper builds on.

# ion

Combine a fixed shape of readable atoms into one derived atom. Import from the root or vanilla entry.

<Demo kind="ion">

<<< @/../examples/docs/ion.tsx#ion

</Demo>

<<< @/../examples/documentation.tsx#ion

## Contract

`ion(atom | record | tuple, project?) → Atom`

Without project, the output mirrors the source shape. With project, it holds the returned value. Single atoms, named records and tuples are supported. Inputs may be native atoms or wrapper-created atoms.

All declared inputs are read on each required recomputation, even when a projector branch uses only one field. For conditional dependencies use stateAtom(get => …) or native atom. Projectors are lazy and pure; Object.is governs output notifications. Promise inputs remain raw Promises: an async projector must await explicitly.

## Why this API

Native derived atoms already combine data. Ion names the fixed sources at the declaration boundary and makes many-input mapping concise. It adds neither automatic awaiting nor an independent scheduler. A fresh object result still changes identity.

## Analogies and reading

- [Effector combine](https://effector.dev/en/api/effector/combine/) — the shape-and-projector analogy; scheduling remains native Jotai.
- [Jotai atom](https://jotai.org/docs/core/atom) — the underlying primitive/read-only/write-only contracts.

- [Jotai: Composing atoms](https://jotai.org/docs/guides/composing-atoms) — explains the native derived/action composition patterns this small helper builds on.

# matchAtom

Read one atom branch selected by a key. Branch atoms are created at declaration time; their values are computed only when a consumer needs them.

<<< @/../examples/spreadsheet/models/view-model.ts#editor-routing
<<< @/../examples/spreadsheet/models/view-model.ts#formula-routing

Here $editing chooses between the draft and the selected cell’s saved input. The inactive branch is not read by matchAtom.

## Contract

`matchAtom(source, cases, { fallback }?) → Atom`

Keys may be strings, numbers or booleans. A closed union requires all cases or an explicit fallback; an open string/number source requires fallback. Supplied branches must be present atoms. An unknown key without fallback throws at runtime. Object keys use their JavaScript string representation, so 1 and '1' identify the same case.

The result is always read-only and its value type is the union of branch and fallback values. Only the source and active branch are dependencies. Switching removes the old branch dependency; other consumers may still read that branch. Jotai controls caching and subscription mounting. Promise values, thrown errors and Suspense Promises keep native behavior.

## Why this API

Branches can contain ion computations. Creating those atoms does not call their projectors. For a calculation with conditional dependencies that do not fit a branch table, use stateAtom(get => …). For a target chosen by a function, use [flatMapAtom](/reference/flatMapAtom). [holoMatch](/reference/holoMatch) selects React Views instead of atom values.

## Analogies and reading

- [Jotai: composing atoms](https://jotai.org/docs/guides/composing-atoms) — native derived reads and forwarded writes.

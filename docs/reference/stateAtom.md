# stateAtom

Create writable state from a value, or read-only derived state from a getter. Import from `jotai-holo` or `jotai-holo/vanilla`.

<Demo kind="counter">

<<< @/../examples/docs/counter.tsx#counter

</Demo>

<<< @/../examples/documentation.tsx#state

## Contract

- `stateAtom(value)` returns a native primitive atom, writable through `set` or a bound callback.
- `stateAtom(get => value)` returns a native read-only atom. The callback receives **only get**; no setter or options.
- Function arguments always mean derived reads. Use native `atom` for a function-valued primitive, writable derived state, or `{ signal }` options.
- Promise values remain Promises outside React bindings. Reads are lazy; Jotai owns dependencies and store isolation.

There is no `storeAtom` alias in the public API.

## Why this API

This is a narrower interface for state declarations, not a replacement for every atom overload. It makes the read-only intent of derived state clear. Use native atom whenever its extra flexibility is the point.

## Analogies and reading

- [Jotai atom](https://jotai.org/docs/core/atom) — the underlying primitive/read-only/write-only contracts.
- [Jotai performance](https://jotai.org/docs/guides/performance) — why stable selections and small subscription boundaries matter.

- [Jotai: Composing atoms](https://jotai.org/docs/guides/composing-atoms) — explains the native derived/action composition patterns this small helper builds on.

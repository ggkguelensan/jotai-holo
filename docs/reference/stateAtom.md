# stateAtom

Store an editable value or derive a value from other atoms. A draft name is state; its character count is derived state.

<Demo kind="counter">

<<< @/../examples/docs/counter.tsx#counter

</Demo>

<<< @/../examples/documentation.tsx#state

## Contract

- `stateAtom(value)` returns a native primitive atom, writable through `set` or a bound callback.
- `stateAtom(read)` returns a read-only atom; `stateAtom(read, write)` supports writable derivations. Native async read options are preserved.
- This is a direct alias of native atom, with no additional state runtime.
- Promise values remain Promises outside React bindings. Reads are lazy; Jotai owns dependencies and store isolation.

## Why this API

Choose stateAtom to express state intent, including derived read/write state. Native atom remains equally supported.

## Analogies and reading

- [Jotai atom](https://jotai.org/docs/core/atom) — the underlying primitive/read-only/write-only contracts.
- [Jotai performance](https://jotai.org/docs/guides/performance) — why stable selections and small subscription boundaries matter.

- [Jotai: Composing atoms](https://jotai.org/docs/guides/composing-atoms) — explains the native derived/action composition patterns this small helper builds on.

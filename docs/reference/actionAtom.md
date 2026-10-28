# actionAtom

Describe an operation that reads or updates atoms. For example, validate a draft and submit it to an API.

<<< @/../examples/documentation.tsx#action

## Contract

- `actionAtom((get, set, ...args) => result)` returns a writable atom whose readable value is `null`.
- Invoke with `store.set(command, ...args)`, `useSetAtom(command)` or `holo.write`.
- Returns the original result, including the original Promise. No automatic cancellation, serialization, retry or success/failure atoms.
- A successful synchronous return publishes the original arguments to connected `bond` consumers. A synchronous throw publishes nothing. Returning a Promise publishes immediately, **before settlement**.
- Native `store.sub(command)` watches the readable value, not calls. Call observation is an extra protocol used by bond.
- The no-handler tuple overload `actionAtom<Args>()` exists; prefer `eventAtom<Payload>()` for a one-payload notification.

## Why this API

Native `atom(null, write)` already handles commands. This helper adds a consistent name and call observation for bond. It is not an Effector Effect: publish an explicit event after awaiting persistence when downstream logic needs a confirmed domain fact.

## Analogies and reading

- [Jotai atom](https://jotai.org/docs/core/atom) — the underlying primitive/read-only/write-only contracts.
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) — a useful distinction between explicit interactions and reactive synchronization.

- [Jotai: Composing atoms](https://jotai.org/docs/guides/composing-atoms) — explains the native derived/action composition patterns this small helper builds on.

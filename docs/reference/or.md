# or

Require at least one boolean atom to be true. Import from `jotai-holo` or `jotai-holo/vanilla`.

<Demo kind="operators">

<<< @/../examples/docs/operators.tsx#operators

</Demo>

## Usage

```ts
import { or } from 'jotai-holo/vanilla';
or([$isOwner, $isAdmin]);
or({ owner: $isOwner, admin: $isAdmin });
```

## Contract

Returns a native read-only atom. Declaration evaluates no input. Computation and cache belong to the current Jotai store; unchanged results do not notify React. Inputs keep native error propagation. These helpers do not implicitly await async atoms; use an async derived atom for that.

Inputs are synchronous boolean atoms. Reading stops at the first true input. Empty input returns false. A branch change releases unused mounted dependencies.

## Why this API

A name makes a common condition or calculation visible at the declaration. Use `ion` for a complete snapshot with an arbitrary projector, or `atom(get => …)` for more complex dynamic dependencies. No extra subscription engine or operator graph is introduced.

## Analogies and reading

- [Patronum operators](https://patronum.effector.dev/operators/) — named conditions and calculations for Effector; these helpers retain Jotai ownership.
- [Jotai atom](https://jotai.org/docs/core/atom) — lazy derived values and dynamic get dependencies.
- [Jotai performance](https://jotai.org/docs/guides/performance) — keep subscriptions close to the values used by the View.

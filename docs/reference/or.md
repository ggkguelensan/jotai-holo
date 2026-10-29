# or

Check whether any boolean atom is true. Use it when either wallet or card payment is enough to proceed.

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

Use a named helper for a condition you want to recognize at a glance. Use `ion` for an arbitrary calculation over fixed inputs, or `atom(get => …)` for conditional dependencies.

## Analogies and reading

- [Patronum operators](https://patronum.effector.dev/operators/) — named conditions and calculations for Effector; these helpers retain Jotai ownership.
- [Jotai atom](https://jotai.org/docs/core/atom) — lazy derived values and dynamic get dependencies.
- [Jotai performance](https://jotai.org/docs/guides/performance) — keep subscriptions close to the values used by the View.

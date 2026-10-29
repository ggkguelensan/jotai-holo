# eq

Compare an atom with a value or another atom. Use `eq($paymentMethod, 'wallet')` to check whether a game order uses the wallet.

## Usage

```ts
import { eq } from 'jotai-holo/vanilla';
eq($status, 'ready');
eq($left, $right);
```

## Contract

Returns a native read-only atom. Declaration evaluates no input. Computation and cache belong to the current Jotai store; unchanged results do not notify React. Inputs keep native error propagation. These helpers do not implicitly await async atoms; use an async derived atom for that.

Object.is comparison: NaN equals NaN; −0 differs from 0. Objects compare by reference. Both declared atoms are read when the result is read.

## Why this API

Use a named helper for a condition you want to recognize at a glance. Use `ion` for an arbitrary calculation over fixed inputs, or `atom(get => …)` for conditional dependencies.

## Analogies and reading

- [Patronum operators](https://patronum.effector.dev/operators/) — named conditions and calculations for Effector; these helpers retain Jotai ownership.
- [Jotai atom](https://jotai.org/docs/core/atom) — lazy derived values and dynamic get dependencies.
- [Jotai performance](https://jotai.org/docs/guides/performance) — keep subscriptions close to the values used by the View.

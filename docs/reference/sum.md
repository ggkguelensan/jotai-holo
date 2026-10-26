# sum

Add numeric values without writing a projector. Import from `jotai-holo` or `jotai-holo/vanilla`.

<Demo kind="operators">

<<< @/../examples/docs/operators.tsx#operators

</Demo>

## Usage

```ts
import { sum } from 'jotai-holo/vanilla';
sum([$goods, $delivery, $tax]);
sum({ goods: $goods, delivery: $delivery });
sum($prices);
```

## Contract

Returns a native read-only atom. Declaration evaluates no input. Computation and cache belong to the current Jotai store; unchanged results do not notify React. Inputs keep native error propagation. These helpers do not implicitly await async atoms; use an async derived atom for that.

Reads every numeric input. Also accepts one numeric atom or an atom of readonly number[]. Empty input returns 0. Uses ordinary JavaScript addition, with its floating-point precision; represent money in minor units. Strings and promises are rejected by TypeScript.

## Why this API

A name makes a common condition or calculation visible at the declaration. Use `ion` for a complete snapshot with an arbitrary projector, or `atom(get => …)` for more complex dynamic dependencies. No extra subscription engine or operator graph is introduced.

## Analogies and reading

- [Patronum operators](https://patronum.effector.dev/operators/) — named conditions and calculations for Effector; these helpers retain Jotai ownership.
- [Jotai atom](https://jotai.org/docs/core/atom) — lazy derived values and dynamic get dependencies.
- [Jotai performance](https://jotai.org/docs/guides/performance) — keep subscriptions close to the values used by the View.

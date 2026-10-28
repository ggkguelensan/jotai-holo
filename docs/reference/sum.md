# sum

Add numeric atom values. For example, calculate an order total from goods and delivery charges.

Read the [Jotai operators overview](/topics/atoms-and-models) for the complete workflow and live examples.

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

Use a named helper for a condition you want to recognize at a glance. Use `ion` for an arbitrary calculation over fixed inputs, or `atom(get => …)` for conditional dependencies.

## Analogies and reading

- [Patronum operators](https://patronum.effector.dev/operators/) — named conditions and calculations for Effector; these helpers retain Jotai ownership.
- [Jotai atom](https://jotai.org/docs/core/atom) — lazy derived values and dynamic get dependencies.
- [Jotai performance](https://jotai.org/docs/guides/performance) — keep subscriptions close to the values used by the View.

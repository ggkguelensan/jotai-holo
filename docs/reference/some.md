# some

Find whether any input matches a condition. Check several game-price atoms, or check the games in one array atom.

## Usage

```ts
import { some } from 'jotai-holo/vanilla';
some([$first, $second], (value) => value.available);
some({ first: $first, second: $second }, (value) => value.available);
some($items, (item) => item.available);
```

## Contract

Returns a native read-only atom. Declaration evaluates no input. Computation and cache belong to the current Jotai store; unchanged results do not notify React. Inputs keep native error propagation. These helpers do not implicitly await async atoms; use an async derived atom for that.

The predicate receives (value, index); record indexes follow Object.values order. Evaluation stops at the first match. Unread later atoms remain dormant. An array-valued atom is one dependency; this does not subscribe separately to its items. Empty input returns false. The predicate must be synchronous and pure.

## Why this API

Use a named helper for a condition you want to recognize at a glance. Use `ion` for an arbitrary calculation over fixed inputs, or `atom(get => …)` for conditional dependencies.

## Analogies and reading

- [Patronum operators](https://patronum.effector.dev/operators/) — named conditions and calculations for Effector; these helpers retain Jotai ownership.
- [Jotai atom](https://jotai.org/docs/core/atom) — lazy derived values and dynamic get dependencies.
- [Jotai performance](https://jotai.org/docs/guides/performance) — keep subscriptions close to the values used by the View.

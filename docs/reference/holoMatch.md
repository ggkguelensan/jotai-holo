# holoMatch

Choose a View from a string or number atom. Import from `jotai-holo`.

<<< @/../examples/documentation.tsx#match

## Contract

`holoMatch({ source, cases, fallback? })`

A closed literal union must have exhaustive cases or a fallback. An open string/number source requires fallback. Source can be Promise-valued; React boundaries handle waiting and errors. Unknown keys without fallback also throw at runtime.

Only the active branch is mounted. Changing a matched key remounts the branch even if both keys use the same View. Consecutive unknown keys keep the same fallback instance; unchanged fallback props can skip its View render. Local state and context retain ordinary React behavior.

Public props must satisfy the required inputs of all possible branches. The source selects a key only: it does not map a discriminated object payload into narrowed branch props. Connect a branch with holo first if it needs state or action bindings.

## Why this API

This turns state-to-View selection into a reusable declaration with explicit exhaustiveness. An ordinary switch or conditional JSX remains clearer for one local branch. ion can derive a compact status key; no separate match scheduler is needed.

## Analogies and reading

- [Reflect variant](https://reflect.effector.dev/docs/variant) — the conditional View binding analogy.
- [Jotai performance](https://jotai.org/docs/guides/performance) — why stable selections and small subscription boundaries matter.

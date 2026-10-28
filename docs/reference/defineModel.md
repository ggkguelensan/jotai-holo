# defineModel

Declare a model factory explicitly while keeping it an ordinary function. This optional identity helper preserves the original function, its creation arguments and its return type.

Read the [Models and registry overview](/overview/models-and-registry) for the complete workflow and live examples.

<<< @/../examples/define-model.ts#factory

## Contract

Import defineModel from `jotai-holo/model`. It returns the same function without calling or wrapping it. Declaration creates no atoms, instances, subscriptions or registry. Each direct factory call creates the record described by your factory.

<<< @/../examples/define-model.ts#usage

TypeScript requires a synchronous object result and rejects Promise results. The helper preserves optional parameters and generic signatures; it does not inspect the returned fields or enforce purity at runtime. Keep subscriptions, I/O and hooks outside the factory. For composition with model modifiers, pass creation data through one initial argument.

## Why this API

Use defineModel to make a factory's role explicit without adding behavior. A plain named function works equally well. Add modelRegistry only when you need shared instance selection; apply other modifiers for their own responsibilities. This helper adds no lifetime management and does not change atom semantics.

See [Model composition](/guide/model-composition) for the distinction between factories, definitions and selected instances.

## Analogies and reading

- [TypeScript generic functions](https://www.typescriptlang.org/docs/handbook/2/generics.html) — preserving a function's input and output types.

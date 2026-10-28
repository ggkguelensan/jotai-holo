# Models and registry

Share a model between an editor and a toolbar using the same key and Jotai store.

## Why use a registry?

A proposal editor and its toolbar must use the same seat count. Another proposal needs an independent count. A factory creates the atoms; a registry lets both widgets select the right existing instance by proposal ID, without passing its atom record through their parents.

In the example below, Seats and Toolbar select the Atlas instance. Adding a seat changes Atlas only. The Beacon widgets select another instance and keep their own count.

<Demo kind="model">

<<< @/../examples/docs/model.tsx#model

</Demo>

```ts
import { modelRegistry, pipe } from 'jotai-holo/model';

const $$profile = pipe(
  createProfileModel,
  modelRegistry({ retainTime: Infinity }),
);

const $profile = $$profile({
  key: ['profile', { id: '42' }],
  initial: { profileId: '42' },
});
```

## What the registry adds

- Shared identity: components selecting the same definition, key and Jotai store use one model instance.
- Independent instances: another key creates a different instance from the same factory.
- Retention: returning to a previously used key can restore its retained in-memory state. `retainTime` defaults to `Infinity`; this is not persistence across a page reload.
- Owner coordination: holo acquires the selected instance after commit and releases it on unmount. Its managed connections stop after the last owner releases it, even if the record remains retained.

The registry selects and retains model records. [modelConnection](/reference/modelConnection), [modelLifecycle](/reference/modelLifecycle) and [modelAnalytics](/reference/modelAnalytics) define the work that runs while they are owned.

## When a registry is unnecessary

Use global atoms for shared application state. Use a plain factory when the application already creates and passes the required instance. Use QueryClient to share server query data by queryKey; a model registry is useful only if the surrounding feature also needs its own instances.

A registry does not clone imported atoms or models. Atoms created inside the factory belong to each new instance; dependencies created outside keep their existing identity. See [Atoms or models?](/guide/atoms-or-models#what-belongs-to-an-instance) for an example.

## defineModel

Declare a model factory explicitly while keeping it an ordinary function. This optional identity helper preserves the original function, its creation arguments and its return type.

<<< @/../examples/define-model.ts#factory

Use defineModel to make a factory's role explicit without adding behavior. A plain named function works equally well. Add modelRegistry only when you need shared instance selection; apply other modifiers for their own responsibilities. This helper adds no lifetime management and does not change atom semantics.

See [Model composition](/guide/model-composition) for the distinction between factories, definitions and selected instances.

## API reference

- [defineModel](/reference/defineModel)
- [modelRegistry](/reference/modelRegistry)

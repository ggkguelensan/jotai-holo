# Effects and Bunshi

## Subscription-owned resources

Use `withAtomEffect` when an external resource should live while a specific atom is subscribed. Bind the **returned atom** in state, not the original one. This example observes state; the effect can also return cleanup for an owned resource.

<<< @/../examples/effect.tsx

For an application-level effect, call `observe(effect, store)` during runtime setup and release its returned disposer. Use the same store as the Provider. `atomEffect` serves effects activated by subscribing to their atom. See [Jotai effect](https://jotai.org/docs/extensions/effect). Holo does not add effectAtom or an effects field.

## Scope-owned model

<<< @/../examples/bunshi.tsx

`holoMolecule` declares atom selection outside render and calls useMolecule inside the binding. Bunshi owns model identity and resources; the Jotai store owns atom values. ScopeProvider selects the Bunshi scope, while Jotai's Provider defines a separate value-storage boundary.

If a molecule itself creates a store and observe effects, the application Provider must receive that exact store. Ordinary holo does not insert it automatically. Full example: [bunshi-effect.tsx](https://github.com/ggkguelensan/jotai-holo/blob/docs/reference-site/examples/bunshi-effect.tsx).

## Why separate tools?

[Bunshi molecules](https://github.com/saasquatch/bunshi) solve DI and lifetime, [jotai-effect](https://jotai.org/docs/extensions/effect) owns reactive resources, and holo binds Views. Keeping these roles separate preserves native tooling and avoids adding Bunshi to applications that do not need it. See the limits in [holoMolecule](/reference/holoMolecule) and [cage](/reference/cage).

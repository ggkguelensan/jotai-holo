# Model composition audit

The native model layer owns keyed instances and resource leases in a Jotai
store. It is not yet a dependency injection container. This distinction matters
when one model needs another model's resources, not just its atom definitions.

## Supported today

| Requirement                              | Native mechanism                                      | Evidence                                                       |
| ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| Default shared instance                  | `Definition()` in the same store                      | `tests/model.test.ts`                                          |
| Named shared and isolated instances      | Structural keys and definition identity               | `examples/models.tsx`, `tests/examples.browser.test.tsx`       |
| Request or session isolation             | A separate Jotai store                                | `tests/model.test.ts`, `tests/model.browser.test.tsx`          |
| First-owner setup and last-owner cleanup | `connect`, `acquire`, `release`                       | `examples/model-effect.tsx`, `tests/examples.browser.test.tsx` |
| Commit-time ownership                    | `holo({ model, … })`                                  | `tests/model.browser.test.tsx`                                 |
| Retention and eviction                   | `retainTime`, `remove`                                | `tests/model.test.ts`                                          |
| Explicit dependency ownership            | Acquire a dependency in `connect`, return its release | `tests/model-composition.test.ts`                              |

The example application uses one ordinary Jotai Provider. Two counter Views
select the same key; the third selects a different key. A shared observer
continues after one owner leaves and stops after the final owner leaves.

## Missing for automatic dependency composition

1. **Dependency resolution during construction.** `create(initial)` receives no
   store or model resolver. A factory can accept dependencies explicitly, but the
   registry does not build a dependency graph or detect cycles between factories.
2. **Transitive ownership.** Reading another model with `store.get` does not
   acquire its resources. The parent must acquire each dependency, roll back
   successful acquisitions if later setup fails, and release them in reverse
   order. No automatic dependency ordering or rollback exists today.
3. **Typed implementation bindings.** There is no model contract token or
   store-local implementation override. Factory injection and native dependency
   atoms are usable application patterns, not registry-level substitution. A
   model cannot be transparently replaced for every downstream consumer.
4. **Scope propagation through dependencies.** Keys are explicit identifiers.
   Parent keys do not propagate to dependencies automatically, and an unrelated
   dependency does not automatically remain shared at a broader scope. Calls
   must choose each dependency's key deliberately.
5. **Hierarchical resolution.** Stores isolate all atom values; they do not
   provide parent/child model registries that inherit bindings and selectively
   override implementations while sharing the parent's other instances.

A structural key accepts JSON-like values rather than arbitrary object identity.
This is intentional resource identity, not a general-purpose context mechanism.
The default retention policy is Infinity: releasing resources preserves model
state until explicit removal or store collection. Resource cleanup and instance
retention are separate contracts.

## Direction

Keep atom factories pure, keep leases explicit outside React, and keep the
ordinary holo binding independent of any external injector. If automatic model
composition is added, its resolver should record dependencies, propagate only
requested scope dimensions, detect cycles, and own acquisition rollback and
reverse-order release. Implementation overrides must be scoped to the owning
registry and established before constructing cached instances.

Validate a diamond dependency, two independent parent owners, setup failure,
cleanup failure, cyclic definitions, different dependency keys, store isolation,
StrictMode replay, Suspense and abandoned renders before claiming full automatic
composition support. Existing keyed-model tests alone do not prove these cases.

See [createModel](/reference/createModel),
[resource lifetime](/recipes/integrations), and
[compatibility evidence](/compatibility).

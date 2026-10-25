# Molecule binding validation

The optional adapter is exercised against the pinned React 19.3.1, Jotai 3.0.1 and Bunshi 2.2.0. Results describe these cases, not a proof that every application is free of leaks.

## Rendering and lifecycle

[Browser tests](../tests/binding.browser.test.tsx) assert:

- One shared resolver for state and action descriptors from the same adapter.
- Unchanged parent props do not rerender View or reselect atoms.
- An increment produces one extra View render and retains action callback identity.
- Writing an unchanged value causes no additional View render.
- Changed public props produce one View render without restarting cage or reselecting atoms.
- Scope changes switch model/atom subscriptions and action targets, preserving View/local state.
- Same-scope consumers share values; distinct scopes and Jotai stores remain isolated.
- Molecule interfaces follow injector replacement.
- Store replacement updates callbacks and restarts cage against the correct stores.
- Actions-only bindings activate the model without subscribing to an atom.
- Resolved async state does not resuspend or restart cage on increment; rejections reach ErrorBoundary.
- Replacing a never-resolving source promise before first commit wakes Suspense.
- Thirty StrictMode mount/unmount cycles leave zero model resources, atom subscriptions and active cages.

[Type tests](../tests/binding-types.test.tsx) cover model inference, interfaces, promise state, writable atom arguments/results, remaining required props, invalid state values, async selectors and read-only action targets. [SSR tests](../tests/binding.test.tsx) verify that resource/cage lifecycles do not start on the server and async action Promise identity is preserved.

The existing React/Jotai development warning for Promise-to-sync transitions also applies to adapted aggregate state. The exact warning is asserted; other console errors fail the test. The isolated native control reproduces it without holo; see [compatibility](compatibility.md#native-development-warning).

## Forced-GC experiment

```sh
pnpm test:memory
```

[The experiment](../scripts/test-molecule-memory.mjs) builds a production application, opens Chromium through Playwright and invokes `HeapProfiler.collectGarbage` three times after each case. The injector, Jotai store, molecule definition and adapter remain alive throughout the experiment. Each model is tracked with a WeakRef, as are its two atoms and rendered action callbacks. A globally retained static atom precedes the model atom in adapted state bindings, exercising cleanup below a live ancestor in the weak-key snapshot cache.

| Case                                             | Mount/unmount cycles | Remaining active resources/subscriptions | Retained models/atoms/callbacks after GC |
| ------------------------------------------------ | -------------------: | ---------------------------------------- | ---------------------------------------- |
| Native useMolecule + Jotai hooks                 |                  200 | 0 / 0                                    | 0 / 0 / 0                                |
| holo with molecule adapter                       |                  200 | 0 / 0                                    | 0 / 0 / 0                                |
| Native initial Suspense abandoned before commit  |                  200 | 0 / 0                                    | 0 / 0 / 0                                |
| Adapted initial Suspense abandoned before commit |                  200 | 0 / 0                                    | 0 / 0 / 0                                |

Pending cases create model-local promises that never resolve, then remove the suspended tree. They test abandoned-render retention without relying on promise settlement for cleanup. The native cases are controls for upstream framework ownership.

The experiment is a separate CI step. It tests collection of tracked objects and lifecycle disposal; it does not claim byte-for-byte heap stability or cover externally retained references, user-created subscriptions or uncancelled user operations.

## Pending snapshot ownership

Selected atoms are read through public `useAtomValueRaw`, retaining Jotai's continuable-promise behavior when a pending source is replaced before first commit. All bindings are read before React awaits the combined result, so later rejections fail fast even when an earlier source never resolves.

Pending aggregate results are cached outside the atom dependency graph. This avoids retaining scoped sources through pending-dependent links from a globally retained synchronous atom. The cache uses weak atom keys and records promise status without modifying the source promise. The forced-GC case with a globally retained first atom guards this behavior.

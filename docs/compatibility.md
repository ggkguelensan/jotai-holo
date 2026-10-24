# Compatibility and evidence

This inventory follows the [Jotai v3 documentation](https://jotai.org/docs). It distinguishes executable checks from ordinary atom-protocol compatibility. It does **not** claim every extension backend, framework, browser or compiler has been certified.

Supported peers are declared in [package.json](../package.json); exact versions used by the suite are in [pnpm-lock.yaml](../pnpm-lock.yaml). Jotai 2 and React 18 are outside the initial support range. TypeScript requires `strict` and supports the `NoInfer` intrinsic; source and packed declarations are checked with TypeScript 5.9. Chromium runs real React DOM. CI runs the same suite on Node 22 and 24.

## Core and utilities

| Jotai capability                                                        | Verification                                                                           | Evidence                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Primitive, derived, nullable, function-result state                     | Executed                                                                               | `state-atom.test.ts`, `utilities.compat.test.ts`                                   |
| Read-only derived state, get-only callback                              | Runtime and compile-negative checks                                                    | `state-atom.test.ts`                                                               |
| Dynamic dependencies                                                    | Executed                                                                               | `utilities.compat.test.ts`                                                         |
| Writable derived atom in state and actions                              | Executed and typechecked                                                               | `utilities.compat.test.ts`                                                         |
| Actions: zero/multiple args, results, nested writes, errors, promises   | Executed                                                                               | `action-atom.test.ts`, `holo.test.tsx`, `async.browser.test.tsx`                   |
| Explicit stores, Provider replacement and isolation                     | Executed                                                                               | `holo.browser.test.tsx`, `async.browser.test.tsx`, `integrations.browser.test.tsx` |
| Atom subscription and onMount                                           | Executed; action bindings do not mount targets                                         | `rendering.browser.test.tsx`                                                       |
| `options.signal`                                                        | Native async atom cancellation executed                                                | `async.browser.test.tsx`                                                           |
| `options.setSelf`                                                       | Native asynchronous self-write executed                                                | `rendering.browser.test.tsx`; not exposed by stateAtom                             |
| `useAtom`, `useAtomValue`, `useSetAtom`, raw variants                   | Native atoms remain usable with native hooks; core hook/context interaction executed   | `rendering.browser.test.tsx`; holo itself uses native `useAtomValue`               |
| Parallel async state, errors, stale resolutions/rejections, sync↔async | Executed in Chromium                                                                   | `async.browser.test.tsx`                                                           |
| Fulfilled async + synchronous update                                    | Executed; no fallback or cage reopen                                                   | `async.browser.test.tsx`                                                           |
| Reset/default/refresh/lazy                                              | Executed                                                                               | `utilities.compat.test.ts`                                                         |
| Storage: sync/async, writes, JSON and RESET                             | Executed with in-memory storage adapters                                               | `utilities.compat.test.ts`; actual cross-tab browser storage events not exercised  |
| SSR markup, async streaming SSR, no lifecycle writes                    | Executed                                                                               | `holo.test.tsx`, `utilities.compat.test.ts`                                        |
| `useHydrateAtoms` before first bound read                               | Executed                                                                               | `integrations.browser.test.tsx`                                                    |
| Family identity/removal (`jotai-family`, v3)                            | Executed                                                                               | `utilities.compat.test.ts`                                                         |
| Callback utility                                                        | Use actionAtom or a native writable atom; useAtomCallback remains usable independently | No special adapter needed; callback utility itself not re-tested                   |
| Reducer, select, split, frozen state                                    | Executed, including unchanged selections/item identity                                 | `utilities.compat.test.ts`, `rendering.browser.test.tsx`                           |
| `unwrap`                                                                | Pending fallback and fulfillment executed                                              | `utilities.compat.test.ts`                                                         |
| Observable                                                              | Subscription/emission executed with RxJS                                               | `utilities.compat.test.ts`                                                         |
| `loadable`                                                              | Removed in Jotai v3                                                                    | Use Suspense or native v3 async utilities; no compatibility shim                   |
| Atoms stored in atoms                                                   | Native atom values are passed unchanged                                                | Covered by splitAtom returning atom definitions; use a child binding for each item |

Test paths above are relative to [`tests/`](../tests). Type-negative fixtures are checked by `pnpm typecheck`; Vitest alone does not check `@ts-expect-error` contracts.

## Extensions and ecosystem

| Extension                      | Verification                                                                             | Boundary                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| jotai-effect                   | Browser: withAtomEffect, atomEffect, observe, last-consumer cleanup                      | `integrations.browser.test.tsx`; runnable effect example                         |
| Bunshi                         | Browser: shared scopes, separate scopes/stores, identity cache, replacement and teardown | `integrations.browser.test.tsx`, `examples.browser.test.tsx`                     |
| Bunshi + observe + owned store | Browser: rendered control and cleanup of real example                                    | `examples.browser.test.tsx`                                                      |
| Immer and Optics               | Runtime reads and writes                                                                 | `utilities.compat.test.ts`                                                       |
| TanStack Query                 | Runtime query cache and suspense query                                                   | Explicit QueryClient, deterministic local queryFn; no production network service |
| XState                         | Runtime actor snapshots and events                                                       | `utilities.compat.test.ts`                                                       |
| History                        | Runtime history read, undo and redo                                                      | `utilities.compat.test.ts`                                                       |
| Eager                          | Actual async state aggregation dependency                                                | Fulfilled/pending/rejected transitions in `async.browser.test.tsx`               |
| tRPC, URQL                     | Ordinary readable/writable atom protocol                                                 | Backend-specific clients, SSR cache and networking **not tested**                |
| Location                       | Ordinary atom protocol                                                                   | URL/hash, navigation and router integration **not tested**                       |
| Cache                          | Ordinary atom protocol                                                                   | Extension-specific expiration/eviction **not tested**                            |
| Bunja                          | Separate ecosystem package                                                               | **Not tested**; Bunshi recipe must not be assumed interchangeable                |

No extension objects are reinterpreted as events. `state` always reads an atom and `actions` always writes an atom. Existing atom utilities can compose freely before binding. An extension's own store/provider/client requirements still apply.

## Frameworks, tools and recipes

| Documentation area                                                       | Status                                                                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js, Waku, Remix                                                     | Generic SSR and preserved client directives tested; framework applications/RSC builds **not run**                                           |
| React Native                                                             | Ordinary React cores are intended to compose; native renderer **not run**                                                                   |
| SWC/Babel/Rolldown, Fast Refresh, Devtools                               | Compiler/devtools integrations **not run**; no compiler transformation is required by holo                                                  |
| TypeScript                                                               | Positive/negative fixtures include payload variance, async results, missing/overlapping props, refs, Promise props and discriminated unions |
| Performance, testing, composing atoms, large objects                     | Executed native store updates, selection/item identity and per-core render assertions                                                       |
| Initializing on render                                                   | Hydration above connected child tested; cage cannot initialize a read that suspends its own first commit                                    |
| Persistence                                                              | Sync/async adapter behavior tested; real browser tabs/backend behavior left to storage extension                                            |
| Toggle/compare/refresh/default recipes                                   | Native atom composition; refresh/default and selector equality exercised, individual copied recipes **not all re-executed**                 |
| Listeners/broadcast/debounce recipes                                     | Native readable/writable atom protocol; recipe timing/cross-tab delivery **not tested**                                                     |
| Custom hooks/useReducerAtom/useAtomEffect recipes                        | Existing hooks remain independent; no hook-to-holo translation is required                                                                  |
| Debug labels/internals/functional programming/comparisons/showcase/Skill | Documentation/tooling concepts rather than additional runtime binding surfaces                                                              |

## Rendering guarantees under test

These are controlled-update observations, not a promise about every render React may schedule:

- An unrelated atom write causes no core calls.
- Same-value writes and unchanged derived selections cause no core calls.
- A leaf update renders only its subscribed core; parent and action-only siblings stay unchanged.
- Static/action-only configurations create zero atom subscriptions.
- An action with multiple writes gives the core one coherent resulting snapshot.
- Callback identity follows store identity; a changed Provider selects the new store.
- Parent updates with unchanged public props skip the memoized connected core.
- A resolved async binding beside a changing sync binding does not re-suspend.
- Native hook consumers inside a memoized core still receive context/store updates.

See [`rendering.browser.test.tsx`](../tests/rendering.browser.test.tsx), [`async.browser.test.tsx`](../tests/async.browser.test.tsx) and [`holo.browser.test.tsx`](../tests/holo.browser.test.tsx). Splitting a large core into independently bound leaves is still the primary way to reduce its update area.

## Package verification

`pnpm test:package` builds a real tarball, extracts it into an isolated consumer directory, imports both public ESM entry points, typechecks a consumer against the **packed declarations**, verifies preserved client directives and checks that the vanilla import graph has no React imports. Tests/examples/dependencies are excluded from the tarball. Optional effect/Bunshi integrations remain development dependencies.

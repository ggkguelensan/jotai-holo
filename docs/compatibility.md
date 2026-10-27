# Compatibility and evidence

This inventory follows the [Jotai v3 documentation](https://jotai.org/docs). It distinguishes executable checks from ordinary atom-protocol compatibility. It does **not** claim every extension backend, framework, browser or compiler has been certified.

Supported peers are declared in [package.json](../package.json); exact versions used by the suite are in [pnpm-lock.yaml](../pnpm-lock.yaml). Jotai 2 is outside the support range. React 18 and 19 are supported (`>=18 <20`), including matching React type definitions. TypeScript requires `strict` and supports the `NoInfer` intrinsic; source and packed declarations are checked with TypeScript 5.9. Chromium runs real React DOM. CI runs the same suite on Node 22 and 24.

## Core and utilities

| Jotai capability                                                        | Verification                                                                           | Evidence                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Primitive, derived, nullable, function-result state                     | Executed                                                                               | `state-atom.test.ts`, `utilities.compat.test.ts`                                   |
| Derived read receives native options, never a Setter                    | Runtime and compile-negative checks                                                    | `state-atom.test.ts`                                                               |
| Dynamic dependencies                                                    | Executed                                                                               | `utilities.compat.test.ts`                                                         |
| Writable derived atom in read and write                                 | Executed and typechecked                                                               | `utilities.compat.test.ts`                                                         |
| Actions: zero/multiple args, results, nested writes, errors, promises   | Executed                                                                               | `action-atom.test.ts`, `holo.test.tsx`, `async.browser.test.tsx`                   |
| Explicit stores, Provider replacement and isolation                     | Executed                                                                               | `holo.browser.test.tsx`, `async.browser.test.tsx`, `integrations.browser.test.tsx` |
| Atom subscription and onMount                                           | Executed; action bindings do not mount targets                                         | `rendering.browser.test.tsx`                                                       |
| `options.signal`                                                        | Native async atom cancellation executed                                                | `async.browser.test.tsx`                                                           |
| `options.setSelf`                                                       | Native asynchronous self-write executed                                                | `rendering.browser.test.tsx`; also available through stateAtom                     |
| `useAtom`, `useAtomValue`, `useSetAtom`, raw variants                   | Native atoms remain usable with native hooks; core hook/context interaction executed   | `rendering.browser.test.tsx`; holo uses native raw atom hooks                      |
| Parallel async state, errors, stale resolutions/rejections, sync↔async | Executed in Chromium                                                                   | `async.browser.test.tsx`                                                           |
| Fulfilled async + synchronous update                                    | Executed; no fallback or lifecycle reopen                                              | `async.browser.test.tsx`                                                           |
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

| Extension        | Verification                                                        | Boundary                                                                         |
| ---------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| jotai-effect     | Browser: withAtomEffect, atomEffect, observe, last-consumer cleanup | `integrations.browser.test.tsx`; runnable effect example                         |
| Immer and Optics | Runtime reads and writes                                            | `utilities.compat.test.ts`                                                       |
| TanStack Query   | Runtime query cache and suspense query                              | Explicit QueryClient, deterministic local queryFn; no production network service |
| XState           | Runtime actor snapshots and events                                  | `utilities.compat.test.ts`                                                       |
| History          | Runtime history read, undo and redo                                 | `utilities.compat.test.ts`                                                       |
| tRPC, URQL       | Ordinary readable/writable atom protocol                            | Backend-specific clients, SSR cache and networking **not tested**                |
| Location         | Ordinary atom protocol                                              | URL/hash, navigation and router integration **not tested**                       |
| Cache            | Ordinary atom protocol                                              | Extension-specific expiration/eviction **not tested**                            |

No extension objects are reinterpreted as events. `read` always reads an atom and `write` always writes an atom. Existing atom utilities can compose freely before binding. An extension's own store/provider/client requirements still apply.

## Frameworks, tools and recipes

| Documentation area                                                       | Status                                                                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js, Waku, Remix                                                     | Generic SSR and preserved client directives tested; framework applications/RSC builds **not run**                                           |
| React Native                                                             | Ordinary React Views are intended to compose; native renderer **not run**                                                                   |
| SWC/Babel/Rolldown, Fast Refresh, Devtools                               | Compiler/devtools integrations **not run**; no compiler transformation is required by holo                                                  |
| TypeScript                                                               | Positive/negative fixtures include payload variance, async results, missing/overlapping props, refs, Promise props and discriminated unions |
| Performance, testing, composing atoms, large objects                     | Executed native store updates, selection/item identity and per-View render assertions                                                       |
| Initializing on render                                                   | Hydration above connected child tested; lifecycle cannot initialize a read that suspends its own first commit                               |
| Persistence                                                              | Sync/async adapter behavior tested; real browser tabs/backend behavior left to storage extension                                            |
| Toggle/compare/refresh/default recipes                                   | Native atom composition; refresh/default and selector equality exercised, individual copied recipes **not all re-executed**                 |
| Listeners/broadcast/debounce recipes                                     | Native readable/writable atom protocol; recipe timing/cross-tab delivery **not tested**                                                     |
| Custom hooks/useReducerAtom/useAtomEffect recipes                        | Existing hooks remain independent; no hook-to-holo translation is required                                                                  |
| Debug labels/internals/functional programming/comparisons/showcase/Skill | Documentation/tooling concepts rather than additional runtime binding surfaces                                                              |

## Rendering guarantees under test

These are controlled-update observations, not a promise about every render React may schedule:

- An unrelated atom write causes no View calls.
- Same-value writes and unchanged derived selections cause no View calls.
- A leaf update renders only its subscribed core; parent and action-only siblings stay unchanged.
- Static/action-only configurations create zero atom subscriptions.
- An action with multiple writes gives the core one coherent resulting snapshot.
- Callback identity follows store identity; a changed Provider selects the new store.
- Parent updates with unchanged public props skip the memoized connected View.
- A resolved async binding beside a changing sync binding does not re-suspend.
- Native hook consumers inside a memoized View still receive context/store updates.

See [`rendering.browser.test.tsx`](../tests/rendering.browser.test.tsx), [`async.browser.test.tsx`](../tests/async.browser.test.tsx) and [`holo.browser.test.tsx`](../tests/holo.browser.test.tsx). Splitting a large View into independently bound leaves is still the primary way to reduce its update area.

## Native development warning

With the pinned React 19.3.1/Jotai 3.0.1, an async→sync transition after initial suspension can emit `This library called use() to suspend ... but did not call use() when it finished`. The same warning is reproduced without holo in `native-async.browser.test.tsx`. Output and update counts remain correct. The suite asserts that exact warning in the isolated native control and in the corresponding aggregate transition; it does not suppress arbitrary console errors. This remains an upstream development-mode limitation, not a promise of warning-free operation for every async→sync sequence.

## Package verification

`pnpm test:package` builds a real tarball, extracts it into an isolated consumer directory, imports public root, vanilla and optional ESM entry points, typechecks a consumer against the **packed declarations**, verifies preserved client directives and checks that the vanilla import graph has no React imports. Tests/examples/dependencies are excluded from the tarball. jotai-effect remains a development dependency. Packed root runtime/declaration graphs are checked to exclude optional integrations.

## React version matrix

`pnpm test:react` installs the packed library into isolated consumers using **React/React DOM 18.0.0, 18.3.1 and 19.3.1**. Each consumer checks its own React-major typings, streaming SSR for ordinary and named-model async bindings, and Chromium development/production scenarios: state/actions/events, ref forwarding through lifecycle/match bindings, pending→resolved→sync→async transitions, rejection boundaries, model replacement, keyed lists and disposal. CI runs each React version separately. The full source, extension and browser suites continue to run with the pinned React 19 environment.

On React 18, refs must terminate at an intrinsic element, class, or `forwardRef` View, following React's normal rules. A plain function View receiving ref as an ordinary prop is a React 19 feature. Holo forwards refs through its React 18 boundaries; it does not polyfill React 19's component API.

The private compatibility layer uses native `React.use` on React 19 and cached Promise settlement with Suspense retries on React 18. It keeps pending results weakly keyed and preserves the existing Jotai/raw-hook aggregation paths. No separate runtime dependency is added. Node, Jotai and TypeScript requirements are unchanged.

## Keyed models, Query and forms

Optional entries remain separate from ordinary root imports. The registry uses native WeakRef/FinalizationRegistry (ES2021+ runtime required). Key identity, store isolation, lease cleanup, finite/Infinity retention, explicit removal and StrictMode are checked by the model suites. A committed model survives temporary Suspense hiding even with retainTime zero; React teardown releases after synchronous child lifecycle reactions. Production Chromium forced-GC cases additionally cover mounted and abandoned Suspense models; `pnpm test:model-memory` checks 300 instances per case, including form controls and discarded stores.

Query tests use native QueryObserver and application-owned QueryClient: options factories, shared cache with useQuery, hydration, key/client replacement, enabled/skipToken, consumed AbortSignal cancellation, stale completions, remount after query-cache eviction and data-only render counts. Infinite and suspense queries have no dedicated wrapper. mutationAtoms uses native MutationObserver: vanilla execution without subscribers, independent Promise results, latest-started state, reset during execution, store/client replacement, retries, scope serialization, online resumption, async callbacks and optimistic rollback are exercised. Browser tests check committed renders, native query-cache sharing, Strict Mode, unmount/remount and abandoned Suspense renders. `pnpm test:mutation-memory` checks 600 calls for listener, history, adapter and store retention.

The RHF bridge uses native createFormControl/useForm/useFormState/FormProvider. Tests cover isolated keyed controls, outside panels, field subscriptions, async transforming resolvers, defaultValues and dirty/touched persistence, focus/validation/reset, async defaults, field arrays and StrictMode. The live business example exercises zodResolver. Other native resolvers use the same unmodified Resolver protocol; their complete validator-specific features are not individually certified.

The packed React matrix additionally exercises keyed model ownership, Query projections and an RHF resolver on React 18.0.0, 18.3.1 and 19.3.1 in development and production. Form values are selectable atoms; form-state flags use native RHF hooks. Options are creation-time configuration, not reactive holo props.

## Model composition limits

Keyed instances and resource leases are supported. Automatic dependency graphs,
transitive ownership and implementation bindings are not implemented. See the
[model composition audit](/model-composition) for the supported mechanisms,
verified examples and remaining requirements.

# State binding aggregation

The internal `createStateBindingAtom` assembles native atom values into core props. It uses public Jotai APIs and standard promises; there is no external runtime dependency or private Jotai/React API.

```text
state bindings
  ├─ direct source dependencies ──────────────┐
  └─ raw snapshot atom → snapshot identity    │
        └─ unwrap each async source          │
              ├─ all ready → synchronous props
              └─ any pending → Promise.all → props / original rejection
                        └─ useAtomValue → React core
```

## States

| Inputs                            | Aggregate result                                                 |
| --------------------------------- | ---------------------------------------------------------------- |
| All synchronous                   | Synchronous props object                                         |
| At least one pending              | Stable promise for that raw snapshot                             |
| All fulfilled, same raw snapshot  | The same fulfilled promise, retained for Suspense retry identity |
| All fulfilled, a new raw snapshot | Synchronous props, without new suspension                        |
| A synchronous read throws         | Original thrown value                                            |
| Any pending promise rejects       | Original reason, without waiting for other pending sources       |

A private symbol distinguishes pending from valid values such as `undefined`, `null`, `false` and `0`. `unwrap` owns per-promise readiness/error bookkeeping. We do not mutate promises with React status fields or maintain a second promise-state cache.

## Snapshot identity

A raw snapshot contains the source values, including original promise references. A WeakMap associates each Jotai-owned raw snapshot with its aggregate result. This caches the **result identity**, not promise readiness: readiness belongs to `unwrap`. Keys are store-owned snapshot arrays, so different stores do not share a snapshot, and obsolete snapshots can be collected.

Retaining a pending snapshot's result prevents a retry from manufacturing a different promise or changing that same snapshot's result representation. When a sync value changes beside a fulfilled async source, the new raw snapshot reads the fulfilled value through `unwrap` and returns plain props.

The aggregate also reads sources **directly**. Before the first React commit, intermediate derived atoms may be unmounted. Direct dependencies let Jotai invalidate/abort the aggregate's pending result when a source changes. This is necessary to escape an old promise that never settles. Native `useAtomValue` keeps Jotai's continuation mechanism; the library does not replace it with raw `React.use`.

## Experiments retained as tests

- Rejection in every position while the remaining requests never settle.
- Success in different resolution orders; the core receives one complete snapshot.
- Original falsy thrown/rejected values, including `null` and `undefined`.
- A fulfilled `undefined` value beside changing sync state.
- Replacing a never-settling source before first commit.
- Pending and fulfilled snapshot identity, including a late subscription.
- Existing async cancellation, stale resolutions/rejections, store switching, SSR, effects, scopes and core render counts.

Tests live in `state-binding-atom.test.ts`, `aggregate.browser.test.tsx` and the existing async/rendering suites. The pinned React/Jotai async→sync development warning has a separate native control; see [compatibility](compatibility.md#native-development-warning).

## Optional adapter bindings

Ordinary atom bindings use this native aggregation path. Model-selected bindings resolve their atoms through the current store and use React-level promise aggregation.

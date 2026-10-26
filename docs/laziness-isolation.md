# Laziness and isolation audit

This audit covers the implemented exports in `src/index.ts`, `src/vanilla.ts`, and
`src/bunshi.ts`. It checks when work starts, which store owns it, and when it stops.
The API contracts below are different from automatic property tracking or deep
cloning of application data.

## Implemented API

| API              | Activation and laziness                                                                                                                                              | Isolation and disposal                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stateAtom`      | A derived callback runs when read or needed by an active dependent. A plain read does not mount resources.                                                           | Values and derived caches belong to the store. Factories create separate model identities within one store.                                                            |
| `ion`            | The projector is lazy. Reading the result reads **all declared inputs**, even if the projector uses only one property.                                               | Native Jotai store ownership and dependency disposal. Conditional inputs should be expressed in a derived atom instead.                                                |
| `prism`          | Each selector is independently lazy. Unread siblings, including async or throwing selectors, do not execute.                                                         | Each output has a per-store cache. The last unsubscribe releases its active dependency; equal results do not notify.                                                   |
| `actionAtom`     | Its handler runs only on a write. Reading or subscribing to its null value does not run the handler or mount sampled state.                                          | `get` and `set`, including after `await`, stay bound to the invocation store. Calls publish after the synchronous handler returns, not after async success.            |
| `eventAtom`      | No replay or payload state. Every write is a separate event, including equal payloads.                                                                               | Delivery channels and queues belong to the store. Payloads are passed by reference.                                                                                    |
| `subscribeEvent` | Installs a listener without running unrelated atom reads.                                                                                                            | An explicit disposer releases that listener; disposing one store does not affect another. It does not cancel work the listener already started.                        |
| `bond`           | Declaration, reading, and observing the output do not connect the link. `connect(store)` activates it. A boolean atom guard can reject before sampled state is read. | Connections are reference-counted per store; the final disconnect releases clocks and upstream links. Dynamic recipients are resolved from that store at delivery.     |
| `holo`           | Declaration reads no state. Mount reads every configured `state` binding. `actions` create write callbacks without reading the action atom.                          | Reads, writes, and callbacks use the nearest store. Shared atom definitions in the same store intentionally share state.                                               |
| `cage`           | Callbacks run in committed passive effects; definition and abandoned render do not invoke them.                                                                      | Props are retained per React instance. Store replacement cleans up the old store and opens the new one. StrictMode can replay effects.                                 |
| `holoList`       | Empty lists do not mount row state. A new list value runs key extraction and mapping for its items. This is not virtualization or incremental list reconciliation.   | Stable keys preserve mounted row identity. Separate stores have separate source values. Removing rows releases their subscriptions.                                    |
| `holoMatch`      | Only the active branch is rendered and subscribed. Inactive Holo branches and molecules remain dormant.                                                              | Branch choice belongs to the nearest store; switching away releases that branch's mounted subscriptions.                                                               |
| `holoMolecule`   | Creating an adapter or descriptor does not instantiate a molecule. Rendering a consumer resolves it through Bunshi.                                                  | Bunshi scopes/injectors govern model sharing; Jotai stores govern atom values. Actions-only bindings still acquire the model, but do not subscribe to its state atoms. |

## Important boundaries

- Use the object of independent selectors for `prism`. A callback returning all
  projections would execute unused computations and is not part of this API.
- Laziness does not mean an active selector never recomputes. Source changes can
  recompute it; `Object.is` determines whether its consumers are notified.
- Newly allocated objects, arrays, or promises are new results. Equal eventual
  async values do not imply equal promise identities or an absence of Suspense.
- Ordinary native atoms used as bond clocks report value changes. A native
  write-only atom with a constant `null` result does not expose its individual
  calls. Use `actionAtom` or `eventAtom` when calls are the trigger.
- `bond` without an explicit trigger observes its state as the clock. Connecting
  therefore reads and mounts that clock; it cannot remain dormant while detecting
  state changes.
- Async actions continue after disconnect or unmount unless the application
  explicitly cancels them. This does not change their original store ownership.
- Two stores do not deep-clone an atom's initial object. Use immutable updates;
  mutating an initial object shared by reference is outside isolation guarantees.
- Two React components bound to the same atoms in the same store share state.
  Per-instance state requires separate model atoms or an appropriate Bunshi scope.
- Creating a new model or atom on every render is not made stable by Holo.
- Disposing an event or bond listener does not dispose the application's store or
  reset its state.

## Evidence

The existing `tests/laziness.test.ts` and `tests/laziness.browser.test.tsx` cover
declaration, read caching, unmounted invalidation, independent prism selectors,
guarded sampling, action-only bindings, empty rows, inactive branches, and cleanup.

The additional audit scenarios are in:

- `tests/isolation.test.ts`: dynamic dependencies in separate stores; separate
  factory models in one store; async projections and writes; nested event queues;
  reference-counted bond chains; per-store recipients; native clock limitations;
  and complete reading of ion inputs.
- `tests/isolation.browser.test.tsx`: one Holo definition across two stores;
  independent callbacks/cages; keyed rows combined with branch switching; and a
  child mount effect writing to a molecule binding before initial commit settles.

Other integration tests cover Bunshi scopes/injectors, store replacement, async
aggregation, error boundaries, native Jotai utilities, and RHF interoperability.
`scripts/test-molecule-memory.mjs` additionally checks mounted and suspended
Bunshi consumers against native controls in production Chromium with forced GC.
This is a bounded retention experiment, not a proof that arbitrary application
models or external resources cannot leak.

Reproduce from this checkout:

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm test:compat
pnpm test:browser
pnpm test:memory
```

Build first: some documentation fixtures import the package's compiled entry.

## Planned integrations

`queryAtoms`, `formMolecule`, `holoForm`, `formAtom`, and `follow` are not implemented
in this checkout. Their runtime laziness or isolation cannot be claimed as tested.

Before introducing them, require these checks:

| Planned API                 | Required activation and isolation checks                                                                                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queryAtoms`                | No observer subscription/fetch at declaration; one shared observer per model/store/client context for all its projections; independently lazy prism selectors; immutable snapshot reads; last-consumer cleanup; remount; client/key replacement; hydration; no second QueryClient; no stale queued updates crossing contexts. |
| `formMolecule` / `holoForm` | A unique instance scope creates its own model and RHF control; ordinary rerenders preserve identity; initial values do not secretly reset the form; discarded renders do not leave external subscriptions; cleanup and StrictMode preserve neighboring forms.                                                                 |
| `formAtom`                  | Read only the selected fields/state; attach subscriptions only while owned; reconcile the initial snapshot with subscription timing; isolate controls and stores; dispose the last listener; avoid synchronous re-entry into RHF from its subscription callback.                                                              |
| `follow`                    | Track only the currently selected inner atom per store; release the old dependency; preserve promise identity; define missing-source behavior; do not create or dispose application models implicitly.                                                                                                                        |

Every future adapter must reuse the independent-selector prism contract rather
than replace it with eager calculation of a record of projections.

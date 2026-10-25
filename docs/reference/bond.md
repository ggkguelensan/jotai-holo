# bond

Route an occurrence into a writable atom, optionally sampling state, filtering and mapping arguments. Import from the root or vanilla entry.

<<< @/../examples/documentation.tsx#bond

## Contract

## Fields and defaults

| Field   | Role                                             | If omitted                                             |
| ------- | ------------------------------------------------ | ------------------------------------------------------ |
| state   | Atom, record or tuple sampled on delivery        | Use trigger arguments                                  |
| trigger | Call notification or readable value-change clock | State becomes the clock                                |
| guard   | `Atom<boolean>` or synchronous predicate         | Accept all                                             |
| map     | Synchronous function returning an argument tuple | `[stateValue]` with state; otherwise trigger arguments |
| yield   | Writable atom or `(get) => writableAtom`         | Publish the resulting tuple on the returned bond       |

At least state or trigger is required. With state, callbacks receive `(stateValue, ...triggerArgs)`; without state, `(...triggerArgs)`. Map must return a tuple, even for one target argument. An atom guard rejects before sampling state; a predicate needs the sampled input. Without a trigger, the state clock itself still has to be read.

## Connection and lifetime

```ts
const stop = notifying.connect(store, { onError: reportError });
// At application/session disposal:
stop();
```

Use the `notifying` from the example returned by `createNotifications(model)`. `store` is the same Jotai store used by the Provider. Multiple connects to the same bond/store share delivery and count owners. The last stop disconnects; stops are idempotent. Connect explicitly outside render. Reading or binding the output does not connect it.

A returned bond is a **read-only atom of the last accepted argument tuple or undefined**, plus a connection API. It is not a writable command. A downstream bond can use it as trigger and will connect/release the upstream automatically. Rejection by guard retains the previous tuple. A state-only output with no yield seeds on connect without publishing an occurrence; a target is not called merely because you connected.

## What can trigger it?

- actionAtom / eventAtom: every successful synchronous call return, with the original arguments. Async command success requires a separate fact event.
- Native readable atom / stateAtom: readable value changes, subject to Jotai equality and batching; not every set.
- Native write-only atom(null, write): **calls are not observable** because its value stays null. The current type accepts it, but it will not behave as a call trigger. Use actionAtom or eventAtom.

State and yield accept compatible native atoms. A yield getter resolves its target for each accepted occurrence, enabling store-local dependency injection without subscribing to the target selection.

## Scheduling and errors

Delivery is FIFO, with a cycle limit. State is read when the queued step runs; earlier handlers may have changed it. This is not an atomic transaction snapshot or Effector computation priority. No async guard, async map, implicit Promise-state awaiting, rollback, or target cancellation is provided. Target throws/rejections go to connected owners' onError, defaulting to console.error; they do not change the original trigger result.

## Why this API

The API borrows the sampling vocabulary from Effector: state/source, trigger/clock, guard/filter, map/fn, yield/target. Explicit connect gives a Jotai store an owner and disposer instead of installing permanent module-level effects. For state-driven reactive synchronization, jotai-effect.observe is usually simpler. For one direct command, calling set inside actionAtom is usually clearer.

## Analogies and reading

- [Effector sample](https://effector.dev/en/api/effector/sample/) — the main API analogy; its scheduler guarantees do not transfer to bond.
- [Jotai effect](https://jotai.org/docs/extensions/effect) — the ready-made alternative for effects driven by dependencies.
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) — a useful distinction between explicit interactions and reactive synchronization.

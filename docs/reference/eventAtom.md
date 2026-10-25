# eventAtom

A typed, one-payload notification without retained event state. Import from the root or vanilla entry.

<<< @/../examples/documentation.tsx#event

## Contract

- `eventAtom<Payload>()` accepts one payload; `eventAtom()` accepts no payload.
- `store.set(event, payload)` publishes within that store. Repeated equal payloads are delivered every time.
- The readable value stays `null`. No last payload, replay, persistence or cross-store broadcast.
- A function or Promise payload is passed as data unchanged. The event does not call or await it.
- Connect with `bond.trigger`, bind with `holo.actions`, or listen with `subscribeEvent`. Native store.sub cannot observe these calls.
- In a DOM handler, call a void event explicitly: `onClick={() => onOpen()}` avoids passing a React event as payload.

Name facts after what happened, such as `profileSaved`. Name requests as requests, such as `saveRequested`; a request event is not proof of success.

## Why this API

It is a thin no-handler actionAtom. Publisher-only code does not import the consumer queue. A state atom is preferable when consumers need the current value; eventAtom is for occurrences that must not collapse just because their payloads are equal.

## Analogies and reading

- [Effector createEvent](https://effector.dev/en/api/effector/createevent/) — the notification API analogy, not an identical runtime.
- [Jotai atomWithListeners recipe](https://jotai.org/docs/recipes/atom-with-listeners) — a state-plus-listener recipe; our event retains no state and has explicit store ownership.
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) — a useful distinction between explicit interactions and reactive synchronization.

# subscribeEvent

Observe an event outside React. Import from the root or vanilla entry. The returned function disposes the subscription.

<Demo kind="event">

<<< @/../examples/docs/event.tsx#event

</Demo>

<<< @/../examples/documentation.tsx#subscription

## Contract

`subscribeEvent(store, event, listener, { onError? }) → stop`

- Store-specific, active immediately, no replay. Each subscription has independent ownership; `stop()` is idempotent.
- Callbacks are dispatched synchronously through a shared FIFO queue. Nested notifications are queued; delivery is not a durable job system.
- Sync throws and returned Promise rejections go to that listener's onError; without one they are logged. Other consumers continue.
- Listener return values are otherwise ignored. Stopping does not cancel already started async work. A rejection after disposal is logged instead of calling the disposed owner's error handler.
- Subscribe during application/session setup or a React effect, never during render. Always dispose with the owner's lifetime.

## Why this API

Native store.sub observes value changes, so a write-only event with constant null has nothing to notify through that channel. Separating subscription from event construction keeps publishing small and lifetime explicit. Use bond for atom-to-atom routing and jotai-effect for reactive state effects.

## Analogies and reading

- [Jotai atom](https://jotai.org/docs/core/atom) — the underlying primitive/read-only/write-only contracts.
- [Jotai effect](https://jotai.org/docs/extensions/effect) — observe is the alternative for state-driven synchronization.

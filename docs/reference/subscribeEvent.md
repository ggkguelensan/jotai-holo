# subscribeEvent

Listen to an event in one store. For example, show a notification after `profileSaved`. Call the returned function when the listener is no longer needed.

<<< @/../examples/documentation.tsx#subscription

## Contract

`subscribeEvent(store, event, listener, { onError? }) → stop`

- Store-specific, active immediately, no replay. Each subscription has independent ownership; `stop()` is idempotent.
- Callbacks are dispatched synchronously through a shared FIFO queue. Nested notifications are queued; delivery is not a durable job system.
- Sync throws and returned Promise rejections go to that listener's onError; without one they are logged. Other consumers continue.
- Listener return values are otherwise ignored. Stopping does not cancel already started async work. A rejection after disposal is logged instead of calling the disposed owner's error handler.
- Use modelConnection for external listeners owned by a model. For atom-to-atom reactions, return a bond from the model factory. Outside React, application/session setup owns the disposer. Never subscribe during render.

## Why this API

Native store.sub observes value changes, so a write-only event with constant null has nothing to notify through that channel. Separating subscription from event construction keeps publishing small and lifetime explicit. Use bond for atom-to-atom routing and jotai-effect for reactive state effects.

## Analogies and reading

- [Jotai atom](https://jotai.org/docs/core/atom) — the underlying primitive/read-only/write-only contracts.
- [Jotai effect](https://jotai.org/docs/extensions/effect) — observe is the alternative for state-driven synchronization.

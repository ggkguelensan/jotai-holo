# useImperativeHolo

Keep router, DOM and editor methods inside View. Connect model events to those methods through `holo.imperative`, without storing React functions in atoms.

<Demo kind="imperative">

<<< @/../examples/docs/imperative.tsx#imperative

</Demo>

## Contract

`useImperativeHolo(imperative, handlers)` exposes a stable method table. Handlers update after commit, without a dependency array. Abandoned renders do not publish handlers. Method names must remain stable. The `imperative` prop is an ordinary typed React ref, supported on React 18 and 19.

`holo.imperative` maps handle methods to eventAtom or actionAtom sources. It does not observe arbitrary writable atoms. Delivery is per View instance, uses the current store and stops when the handle is unavailable. Events are not replayed after mount or Suspense reveal. Two Views observing one source both receive its events; choose one navigation owner deliberately.

Subscriptions are installed before holo acquires model/resources and runs its own mount lifecycle. Child layout effects are outside that startup ordering. Do not depend on a View handle during unmount. Synchronous throws and rejected handler promises go to `holo.onError`, or console.error when omitted. Publishers do not await View methods.

The demo simulates a successful order boundary. In an application, publish orderCreated after the server accepts the order; the View method can call its router instead of selecting a local confirmation screen.

## Why this API

Use imperative methods for behavior that cannot be expressed as state props. Keep ordinary modal visibility in read bindings. The model publishes facts; the View implements platform behavior. See the [runtime migration guide](/runtime) for named models, lifecycle and resources.

## Analogies and reading

- [React useImperativeHandle](https://react.dev/reference/react/useImperativeHandle) — the underlying committed handle mechanism.
- [React purity](https://react.dev/reference/rules/components-and-hooks-must-be-pure) — why render cannot register callbacks or subscriptions.

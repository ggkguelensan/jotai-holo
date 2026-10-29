# useImperativeHolo

Keep router, DOM and editor methods inside View. Connect model events to those methods through `holo.imperative`, without storing React functions in atoms.

## Contract

`useImperativeHolo(imperative, handlers)` exposes a stable method table. Handlers update after commit, without a dependency array. Abandoned renders do not publish handlers. Method names must remain stable. The `imperative` prop is an ordinary typed React ref, supported on React 18 and 19. Each call uses the latest committed props and context, even when holo's own binding props have not changed.

`holo.imperative` maps handle methods to eventAtom or actionAtom sources. It does not observe arbitrary writable atoms. Delivery is per View instance, uses the current store and stops when the handle is unavailable. Events are not replayed after mount or Suspense reveal. Two Views observing one source both receive its events; choose one navigation owner deliberately.

Subscriptions are installed before holo activates selected models. Child layout effects are outside that startup ordering. Do not depend on a View handle during unmount. Synchronous throws and rejected handler promises go to `holo.onError`, or console.error when omitted. Publishers do not await View methods.

The demo simulates a successful order boundary. In an application, publish orderCreated after the server accepts the order; the View method can call its router instead of selecting a local confirmation screen.

Try [focus, animation and native sharing](/examples/view-methods) in the browser.

## Focus a search field

The toolbar publishes `searchFocusRequested`. Search owns its DOM ref and
focuses the field on every request. No model stores an element or callback.

<<< @/../examples/docs/imperative-focus.tsx#focus

## Restart a cart animation

A UI request highlights the cart. Each occurrence restarts the animation;
repeated requests need no state reset. The View respects reduced motion and
keeps the animation implementation out of the atom graph.

<<< @/../examples/docs/imperative-animation.tsx#animation

## Call a method returned by a React hook

Reactuse's [useShare](https://reactuse.org/functions/hooks/useShare.html) stays
inside View. The request reaches the latest committed `share.trigger`, using
the View's current title and URL. Reactuse is an optional application dependency;
these hooks are not bundled into holo.

<<< @/../examples/docs/imperative-share.tsx#share

The button is disabled when sharing is unavailable. Closing the native dialog
is not an application failure: the handler ignores `AbortError`. Other failures
reach `holo.onError` through the returned promise.

[Web Share requires user activation](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share#security).
Keep the click → event → View call synchronous until `share.trigger()` is called.
Do not launch sharing after a network response, lazy import or queued delivery;
`useImperativeHolo` cannot restore an expired browser activation.

## Why this API

Use imperative methods for behavior that cannot be expressed as state props. Keep ordinary modal visibility in read bindings. The model publishes facts; the View implements platform behavior. See the [runtime migration guide](/runtime) for named models, committed input and ownership.

## Analogies and reading

- [React useImperativeHandle](https://react.dev/reference/react/useImperativeHandle) — the underlying committed handle mechanism.
- [React purity](https://react.dev/reference/rules/components-and-hooks-must-be-pure) — why render cannot register callbacks or subscriptions.

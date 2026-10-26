# cage

Send a component's input props to model actions after React commits the render. For example, update a search query when the `term` prop changes. Configure it inside `holo`.

<Demo kind="cage">

<<< @/../examples/docs/cage.tsx#cage

</Demo>

<<< @/../examples/documentation.tsx#cage

## Contract

`onMount(get, set, ctx)`, `onChange(get, set, ctx)`, `onUnmount(get, set, ctx)` are synchronous and return nothing. Async handlers and cleanup returns are not supported. Dispatch actions from handlers; let the model own async policies.

For each committed instance/store, order is mount → initial change → later shallow input changes → unmount. State changes alone do not trigger onChange. `ctx.props` merges public inputs and bindProps, excludes state/actions outputs, and uses the latest committed inputs on unmount.

Cage uses passive React effects. StrictMode may replay mount/change/unmount; handlers must tolerate it. SSR and abandoned renders do not publish lifecycle writes. Replacing the Jotai store closes the old cage and opens a new one. Ordinary Suspense hiding does not close it; initial Suspense delays its first commit.

Input props come from the View's type. Even a prop used only by cage must be declared on the View, as `term` is above. Initialize data before rendering if the first render would suspend while waiting for it.

## Why this API

Gate-like props-to-model wiring fits beside a View binding, avoiding an extra forwarding hook. This is not an Effector Gate: no shared open/close/status object exists. Use jotai-effect for subscription-owned resources or store-wide reactive effects instead of returning cleanup from cage.

## Analogies and reading

- [Effector useGate](https://effector.dev/en/api/effector-react/usegate/) — the props-to-model analogy; not an identical lifecycle object.
- [React useEffect](https://react.dev/reference/react/useEffect) — commit, cleanup and StrictMode constraints.
- [Jotai effect](https://jotai.org/docs/extensions/effect) — the resource ownership alternative.

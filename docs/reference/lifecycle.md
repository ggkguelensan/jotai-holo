# lifecycle

React to committed input props without a forwarding effect in each View. For example, send a changed search term to a model action.

<Demo kind="lifecycle">

<<< @/../examples/docs/lifecycle.tsx#lifecycle

</Demo>

<<< @/../examples/documentation.tsx#lifecycle

## Contract

Handlers are synchronous inline functions or writable atoms. They receive get, set and a context with readonly input and resolved models. Async handler results and returned cleanup functions are unsupported; resources own cleanup.

Resources connect before onMount and the initial onInputChange. An optional input selector compares chosen fields shallowly; without one all input props are compared. ctx.input contains the latest committed caller and fixed props, excluding generated read/write props. State changes alone do not trigger input reactions.

StrictMode replay is one logical owner. Temporary Suspense hiding preserves ownership; initial Suspense and abandoned render do not activate it. On replacement, the previous lifecycle closes before the next resources and mount activate. Actual unmount invokes onUnmount before resource release in a microtask. Do not rely on a View imperative handle during teardown.

Initialize state before rendering if its pending read blocks the first commit. Lifecycle cannot initialize the value that prevents its own mount.

## Why this API

Use lifecycle for input-to-model reactions, resources for owned subscriptions and atom effects for reactive dependencies. These roles have different triggers and lifetimes. Errors are reported through holo.onError; asynchronous actions need their own handled promise and cancellation policy.

## Analogies and reading

- [Effector useGate](https://effector.dev/en/api/effector-react/usegate/) — the input-to-model analogy.
- [React effects](https://react.dev/reference/react/useEffect) — commit and cleanup constraints.
- [Jotai effect](https://jotai.org/docs/extensions/effect) — reactive synchronization.

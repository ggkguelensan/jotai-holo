# input

Forward committed input props to model actions without a forwarding effect in each View.

<Demo kind="input">

<<< @/../examples/docs/input.tsx#input

</Demo>

<<< @/../examples/documentation.tsx#input

## Contract

input maps prop names to writable atoms, directly or through a named-model callback. Each target receives its initial value after commit, then only changes compared with Object.is. Fixed props win. Generated read, write and imperative props cannot be input sources. Native writable atoms, actionAtom and eventAtom are accepted. Async results and synchronous failures reach holo.onError.

StrictMode replay does not repeat initial input. Suspended or abandoned renders publish no input. Temporary Suspense hiding preserves model ownership; real unmount releases it. Input cannot initialize the pending state that prevents its own first commit.

## Why this API

Input synchronization and model ownership have separate responsibilities. Models own subscriptions and data lifecycles; holo forwards selected committed props without a proxy or an extra input atom.

## Analogies and reading

- [Effector useGate](https://effector.dev/en/api/effector-react/usegate/) — the input-to-model analogy.
- [React effects](https://react.dev/reference/react/useEffect) — commit constraints.

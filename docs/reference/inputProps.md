# inputProps

Forward committed input props to model actions without a forwarding effect in each View.

<Demo kind="input">

<<< @/../examples/docs/input.tsx#input

</Demo>

<<< @/../examples/documentation.tsx#input

## Contract

inputProps maps prop names to writable atoms, directly or through a named-model callback. Each target receives its initial value after commit, then only changes compared with Object.is. Fixed props win. Generated read, write and imperative props cannot be input sources. Native writable atoms, actionAtom and eventAtom are accepted. Async results and synchronous failures reach holo.onError.

StrictMode replay does not repeat initial input. Suspended or abandoned renders publish no input. Temporary Suspense hiding preserves model ownership; real unmount releases it. Input cannot initialize the pending state that prevents its own first commit.

## Model inputs and View props

inputProps does not supply a prop or remove it from the public component type. In this example, callers must pass both counterId and initial. The View receives those props together with count, callbacks and the fixed title.

<<< @/../examples/input-contract.tsx#input-model
<<< @/../examples/input-contract.tsx#input-view
<<< @/../examples/input-contract.tsx#input-binding
<<< @/../examples/input-contract.tsx#input-usage

initial here is a live input, not creation-only data. Changing it writes count again. An increment followed by a parent render with the same initial leaves count unchanged. For creation-only input, pass initial in the model selection instead.

## Why this API

Input synchronization and model ownership have separate responsibilities. Models own subscriptions and data lifecycles; holo forwards selected committed props without a proxy or an extra input atom.

## Analogies and reading

- [Effector useGate](https://effector.dev/en/api/effector-react/usegate/) — the input-to-model analogy.
- [React effects](https://react.dev/reference/react/useEffect) — commit constraints.

# holo

Connect models and atoms to a React component. Declare the connection once, outside React render. The View receives ordinary props.

<span id="atoms-without-models"></span>
<span id="named-models"></span>

Read the [holo overview](/topics/holo) for the complete workflow and live examples.

Use holo when decomposing a screen into small Views and moving business workflows into models. Bind subscriptions near the View that needs them. See [Business logic and small Views](/guide/business-logic) for when to keep native Query and RHF hooks.

<<< @/../examples/documentation.tsx#holo

## Contract

| I want to…                                  | Use                                |
| ------------------------------------------- | ---------------------------------- |
| Choose the React component                  | `view`                             |
| Connect models to the component             | `models`                           |
| Use an atom value in the component          | `read`                             |
| Send a component interaction to an atom     | `write`                            |
| Make the component react to external events | `imperative` + `useImperativeHolo` |
| Pass static values to the component         | `static`                           |
| Forward incoming props to the model         | `input`                            |
| Handle connection and delivery errors       | `onError`                          |

Only `view` is required.

`read`, `write`, `static` and `imperative` supply View props. Pass the remaining props from the parent. `input` forwards selected incoming props to atoms; these props still reach the View.

## Input

input maps incoming prop names to writable atoms. Targets receive the initial committed value and then changes compared with Object.is. Generated read, write and imperative props cannot be input sources. The input props remain public and reach the View. Async failures go to onError.

StrictMode replay does not repeat initial input. Abandoned renders publish nothing. Input cannot initialize pending state that prevents its own first commit. For creation-only values, use the model selection's initial data.

## Rendering and types

- Only `read` subscribes to atom state. The same writable atom can be used in both `read` and `write`.
- Unchanged values and shallow-equal caller props skip View rendering. Write callbacks remain stable while the store and target atoms stay the same. Local state and React context update normally.
- Changing the selected model instance remounts the View. Changing an ordinary prop does not.
- Async atom values resolve before reaching the View; use React Suspense and error boundaries while they are pending or fail.
- A prop cannot be supplied by several binding sections. Parents do not supply props already provided by `read`, `write`, `static` or `imperative`.
- Specialize generic Views before binding them. On React 18, use `forwardRef` when the View needs a forwarded ref.

## Why this API

Describe the connection next to the View. Keep state and business actions in models. The View receives values and callbacks, so it can also be rendered directly in tests and stories.

## Analogies and reading

- [Reflect motivation](https://reflect.effector.dev/learn/motivation) — external bindings between a model and a View.
- [Jotai atom](https://jotai.org/docs/core/atom) — native read and write contracts.
- [Jotai performance](https://jotai.org/docs/guides/performance) — small subscription boundaries.

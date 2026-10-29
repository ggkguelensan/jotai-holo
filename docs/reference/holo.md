# holo

Connect models and atoms to a React component. Declare the connection once, outside React render. The View receives ordinary props.

<span id="atoms-without-models"></span>
<span id="named-models"></span>

Use holo when decomposing a screen into small Views and moving business workflows into models. Bind subscriptions near the View that needs them. See [Business logic and small Views](/guide/business-logic) for when to keep native Query and RHF hooks.

The example binds `$name` and `changeName` to `NameView`. Their definitions are
in the [name-field example source](https://github.com/ggkguelensan/jotai-holo/blob/main/examples/documentation.tsx).
For a complete first binding with one writable atom, follow
[getting started](/guide/getting-started).

<<< @/../examples/documentation.tsx#holo

## Contract

| I need to…                                  | Use                        |
| ------------------------------------------- | -------------------------- |
| Choose the React component                  | `view`                     |
| Connect models to the component             | `models`                   |
| Use an atom value in the component          | `read`                     |
| Send a component interaction to an atom     | `write`                    |
| Make the component react to external events | `events` + `useHoloEvents` |
| Pass static values to the component         | `static`                   |
| Forward incoming props to the model         | `input`                    |
| Handle connection and delivery errors       | `onError`                  |

Only `view` is required. `models` is optional: pass native atoms directly to object-form `read` and `write` when no model ownership is needed. [Atoms without models](/topics/holo#atoms-without-models) shows this arrangement.

`read`, `write`, `static` and `events` supply View props. Pass the remaining props from the parent. `input` forwards selected incoming props to atoms; these props still reach the View.

### Models and binding maps

`models` maps names to model selections. A [model definition](/topics/models-and-registries) is the selectable value returned by model modifiers. Pass a definition for its default instance, a selected model atom for a fixed key, or a function of incoming props to choose the instance. Matching registry namespaces, keys and stores share a record. holo acquires managed models after commit and releases them on cleanup.

`read`, `write`, `input` and `events` accept an object or a callback receiving the resolved model records. These callbacks choose atom references; they are not reactive selectors over the atoms' values. Use a derived atom or [ion](/reference/ion) for calculations.

`static` is an object of fixed View props. `onError` handles model-connection, input-delivery and imperative-handler errors; it does not replace React error boundaries or catch a Promise returned to the caller by a `write` callback.

## Input

input maps incoming prop names to writable atoms. Targets receive the initial committed value and then changes compared with Object.is. Generated read, write and events props cannot be input sources. The input props remain public and reach the View. Async failures go to onError.

StrictMode replay does not repeat initial input. Abandoned renders publish nothing. Input cannot initialize pending state that prevents its own first commit. For creation-only values, use the model selection's initial data.

## Rendering and types

- `read` subscribes the View to displayed atom values. `write`, `static` and `input` do not subscribe the View to their target atoms. Model selection and managed connections have their own subscriptions. The same writable atom can be used in both `read` and `write`.
- Unchanged values and shallow-equal caller props skip View rendering. Write callbacks remain stable while the store and target atoms stay the same. Local state and React context update normally.
- Changing the selected model instance remounts the View. Changing an ordinary prop does not.
- Async atom values resolve before reaching the View; use React Suspense and error boundaries while they are pending or fail.
- A prop cannot be supplied by several binding sections. Parents do not supply props already provided by `read`, `write`, `static` or `events`.
- Specialize generic Views before binding them. On React 18, use `forwardRef` when the View needs a forwarded ref.

## Why this API

Describe the connection next to the View. Keep state and business actions in models. The View receives values and callbacks, so it can also be rendered directly in tests and stories.

## Analogies and reading

- [Reflect motivation](https://reflect.effector.dev/learn/motivation) — external bindings between a model and a View.
- [Jotai atom](https://jotai.org/docs/core/atom) — native read and write contracts.
- [Jotai performance](https://jotai.org/docs/guides/performance) — small subscription boundaries.

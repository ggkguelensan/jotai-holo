# holo

Connect models and atoms to a React component. Declare the connection once, outside React render. The View receives ordinary props.

<Demo kind="counter">

<<< @/../examples/docs/counter.tsx#counter

</Demo>

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

## Atoms without models

`models` is optional. Pass atoms directly to `read` and `write`: holo does not require a model factory, registry or model modifiers. Native `atom(...)`, `stateAtom`, `actionAtom` and `eventAtom` work according to their read and write capabilities.

<<< @/../examples/atoms-or-models.tsx#atom-imports
<<< @/../examples/atoms-or-models.tsx#global-atoms

Here, `read` subscribes to the global theme atom. `write` supplies a theme setter and a callback that publishes `helpRequested`. The same View can use unrelated atoms; they do not need to belong to one model.

Global means shared within the same Jotai store. A separate store has independent atom values and event delivery. See [Atoms or models?](/guide/atoms-or-models) for typical choices.

## Named models

```tsx
const Counter = holo({
  models: {
    counter: (props: { counterId: string }) =>
      $$counter({ key: ['counter', props.counterId] }),
    session: $$session,
  },
  view: CounterView,
  read: ({ counter }) => ({ count: counter.$count }),
  write: ({ counter }) => ({ onIncrement: counter.increment }),
});
```

- Pass a model definition to use its default instance in the current Jotai store.
- Select a key to share that instance between components using the same model, key and store.
- Use incoming props to choose the key. In this example, the parent passes `counterId`.
- holo activates the selected models after commit and releases them on unmount. A shared model stays active while another owner uses it.

See [modelRegistry](/reference/modelRegistry) for instance ownership, [input](/reference/input) for prop synchronization and [useImperativeHolo](/reference/useImperativeHolo) for View methods.

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

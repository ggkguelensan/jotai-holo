# holo

Connect models and atoms to a React component. Declare the connection once, outside React render. The View receives ordinary props.

Use holo when decomposing a screen into small Views and moving business workflows into models. Bind subscriptions near the View that needs them. See [Business logic and small Views](/guide/business-logic) for when to keep native Query and RHF hooks.

<<< @/../examples/documentation.tsx#holo

[Try bindings and input](/examples/view-bindings) or [order confirmation](/examples/order-confirmation).

## Atoms without models

`models` is optional. Pass atoms directly to `read` and `write`: holo does not require a model factory, registry or model modifiers. Native `atom(...)`, `stateAtom`, `actionAtom` and `eventAtom` work according to their read and write capabilities.

<<< @/../examples/atoms-or-models.tsx#atom-imports
<<< @/../examples/atoms-or-models.tsx#global-atoms

Here, `read` subscribes to the global theme atom. `write` supplies a theme setter and a callback that publishes `helpRequested`. The same View can use unrelated atoms; they do not need to belong to one model.

Global means shared within the same Jotai store. A separate store has independent atom values and event delivery. See [Atoms or models?](/topics/atoms-and-models) for typical choices.

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

## Input synchronization

Forward committed input props to model actions without a forwarding effect in each View.

## Imperative View methods

Keep router, DOM and editor methods inside View. Connect model events to those methods through `holo.imperative`, without storing React functions in atoms.

## Rendering and async

Read [Rendering and async](/guide/rendering) for subscription boundaries, Suspense and model ownership.

## API reference

- [holo](/reference/holo)
- [input](/reference/input)
- [useImperativeHolo](/reference/useImperativeHolo)

## Lists and branches

holoList binds an array atom to keyed rows; holoMatch selects a View from a status atom. Use deliberate stable row keys. An ordinary switch remains suitable for a local conditional.

[Try rows and screen states](/examples/lists-and-branches). See [holoList](/reference/holoList) and [holoMatch](/reference/holoMatch) for contracts.

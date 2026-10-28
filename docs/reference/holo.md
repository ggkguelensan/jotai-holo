# holo

Connect a React View to atom values and commands. The View receives ordinary props; holo owns subscriptions and selected model leases.

<Demo kind="counter">

<<< @/../examples/docs/counter.tsx#counter

</Demo>

<<< @/../examples/documentation.tsx#holo

## Contract

| Field      | Role                                     |
| ---------- | ---------------------------------------- |
| view       | React View or element; required          |
| models     | Named default or keyed model selections  |
| read       | Readable atoms mapped to value props     |
| write      | Writable atoms mapped to callback props  |
| props      | Fixed View props                         |
| input      | Committed props mapped to writable atoms |
| imperative | Event sources mapped to View methods     |

Declare outside React render. Supplied keys disappear from public props. Binding collisions are rejected. Fixed props win over caller values. Any native atom works; the same writable atom can appear in read and write. Async reads resolve before reaching View. Write callbacks preserve arguments and return values.

Only read bindings subscribe to state. Unchanged values and shallow-equal input props skip View rendering; write callbacks stay stable while store and targets do. Context and local hook updates retain ordinary React behavior. Use small connected Views for independent rendering. Specialize generic Views first; bindings must be valid across union branches.

## Named models

```tsx
const Counter = holo({
  models: {
    counter: (input: { counterId: string }) =>
      $$counter({ key: ['counter', input.counterId] }),
    session: $$session,
  },
  view: CounterView,
  read: ({ counter }) => ({ count: counter.$count }),
  write: ({ counter }) => ({ onIncrement: counter.increment }),
});
```

A definition selects the default instance in the current store. A keyed selection shares the instance only with the same definition, structural key and store. Annotate selector input types; they become required public props. Changing model identity remounts the resolved View. Ordinary input changes do not. No extra Provider is required beyond Jotai store isolation.

Selected models activate after commit and release after the last owner. Use [input](/reference/input) for prop synchronization and [useImperativeHolo](/reference/useImperativeHolo) for View methods. Raw lifecycle and resources fields are rejected. On React 18, ordinary forwarded refs need an intrinsic, class or forwardRef View.

## Why this API

read and write describe atom capabilities without classifying atoms as commands or state. Models choose instances and own connections. The same View remains directly usable in tests and stories.

## Analogies and reading

- [Reflect motivation](https://reflect.effector.dev/learn/motivation) — external bindings between a model and a View.
- [Jotai atom](https://jotai.org/docs/core/atom) — native read and write contracts.
- [Jotai performance](https://jotai.org/docs/guides/performance) — small subscription boundaries.

# holo

Bind an ordinary View to atom values, writable callbacks and fixed props. Import from `jotai-holo`.

<Demo kind="counter">

<<< @/../examples/docs-demos.tsx#counter

</Demo>

<<< @/../examples/documentation.tsx#holo

## Contract

| Field     | Meaning                                                      |
| --------- | ------------------------------------------------------------ |
| core      | React View component or intrinsic element                    |
| state     | View prop → readable atom or optional adapter descriptor     |
| actions   | Callback prop → writable atom or optional adapter descriptor |
| bindProps | Fixed ordinary props, including functions/components         |
| cage      | Optional committed lifecycle/input bridge                    |

Declare outside React render. Remaining View props are public; supplied keys are omitted from caller types. A prop cannot occur in several binding sections. Fixed values win over incoming runtime values.

Any compatible native atom works: `state: { count: countAtom }` and `actions: { onChange: countAtom }` can use the **same writable atom**. A read-only atom is not an action target. Promise-valued state resolves before reaching View; the View prop type is the resolved type. Action callbacks preserve arguments and return values.

The binding and View use React.memo's shallow comparison. Action-only bindings do not subscribe to their targets; callbacks stay stable while store and target do. No subscription to every atom in a model is created. New objects in selected values or incoming props can still render View. Context and local hook updates retain normal React behavior.

For generic Views, specialize the component first so its prop types are concrete. State/actions bindings must be valid across relevant union branches; the adapter does not narrow discriminated payloads for you. Use a Jotai Provider for store isolation; no holo Provider is needed.

## Why this API

The goal is declarative wiring without thin forwarding hooks. Explicit sections distinguish reading, writing and static data without runtime atom detection. useAtomValue/useSetAtom remain a good choice for local hook-heavy components; holo is valuable when the View should stay independent of the model.

## Analogies and reading

- [Reflect motivation](https://reflect.effector.dev/learn/motivation) — the direct inspiration for external View bindings.
- [Jotai atom](https://jotai.org/docs/core/atom) — the underlying primitive/read-only/write-only contracts.
- [Jotai performance](https://jotai.org/docs/guides/performance) — why stable selections and small subscription boundaries matter.

On React 18, ref targets must be intrinsic elements, classes or forwardRef Views. Ref as an ordinary function-View prop requires React 19. Holo forwards refs through its wrappers on both supported versions.

## Keyed models

The optional `model` selects an instance in the current store. State/actions/cage factories receive it. The registry in `jotai-holo/model` is imported by the application only; ordinary atom bindings need no registry. See [createModel](/reference/createModel).

```tsx
const Counter = holo({
  model: (props: { counterId: string }) =>
    CounterModel({ key: ['counter', { id: props.counterId }] }),
  core: CounterView,
  state: ($$counter) => ({ count: $$counter.$count }),
  actions: ($$counter) => ({ onIncrement: $$counter.increment }),
});
```

# Interface

The React configuration uses view, models, read, write, props, input and imperative. Only view is required. There are no compatibility aliases.

## Atoms and operators

stateAtom is a direct alias of native atom, including read/write derivations and async read options. actionAtom preserves write arguments and results. eventAtom publishes every occurrence without retained payload state. Native atoms remain valid inputs to all compatible bindings.

ion combines sources; prism creates independently lazy projections. eq, and, or, some and sum provide common calculations. bond connects state, trigger, guard, map and yield under explicit resource ownership. subscribeEvent is for imperative consumers outside declarative model connections.

See [stateAtom](reference/stateAtom.md), [eventAtom](reference/eventAtom.md), [operators](operators.md) and [bond](reference/bond.md).

## React and models

```tsx
const Counter = holo({
  models: { counter: $$counter },
  view: CounterView,
  read: ({ counter }) => ({ count: counter.$count }),
  write: ({ counter }) => ({ onChange: counter.$count }),
  props: { title: 'Counter' },
});
```

createModel uses pure create, optional resources and retainTime. Model identity is definition + structural key + store. Resources connect after acquisition and disconnect after the last owner; retention preserves state separately. Input maps committed props to writable atoms. useImperativeHolo implements View methods without moving React capabilities into atoms.

See [holo](reference/holo.md), [createModel](reference/createModel.md), [input](reference/input.md), [useImperativeHolo](reference/useImperativeHolo.md) and the [runtime guide](runtime.md).

## Optional integrations

Query and Mutation use the query entry. RHF uses named models and an explicit form selector. Persistence uses the persist entry and a library-independent codec. These modules are absent from ordinary holo imports.

See [queryAtoms](reference/queryAtoms.md), [mutationAtoms](reference/mutationAtoms.md), [holoForm](reference/holoForm.md) and [persistence](runtime.md#persistence).

Model modifiers: [modelRegistry](reference/modelRegistry.md), [modelLifecycle](reference/modelLifecycle.md), [modelAnalytics](reference/modelAnalytics.md). [createAnalytics](reference/createAnalytics.md) provides optional independent engine routing.

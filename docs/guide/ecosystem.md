# Choosing a tool

Start with the task, then choose the tool. Existing Jotai atoms work in holo; you can keep them and add only the helpers you need.

| Task                                    | Start with                             | What holo adds                                                          |
| --------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Local component state                   | useAtom / useAtomValue / useSetAtom    | A separate binding for a small View                                     |
| Conditional derived reads               | atom(get => …)                         | stateAtom preserves native overloads; ion names a fixed input shape     |
| One selected value with custom equality | selectAtom                             | prism declares several independent projections, without custom equality |
| Per-item writable atoms                 | splitAtom                              | holoList renders keyed Views; it does not replace item atoms            |
| Reactive external resource              | jotai-effect                           | input bridges committed props; models own managed connections           |
| One call / a domain fact                | actionAtom / eventAtom                 | Every invocation can trigger bond, independent of value equality        |
| Server data used only by React          | Native TanStack Query hooks            | No atom adapter is required                                             |
| Server data needed by atom workflows    | createQueryModel / createMutationModel | Named projections and writable actions reuse the existing QueryClient   |
| Share one model across widgets          | modelRegistry                          | Select a default or keyed instance in the current store                 |

## Why not atomWithListeners?

The official [atomWithListeners recipe](https://jotai.org/docs/recipes/atom-with-listeners) demonstrates notifying callbacks alongside state writes and provides a React hook for listeners. It is a recipe to adapt, not an imported Jotai utility. Our event API has a different contract: no retained payload, explicit store ownership, a disposer usable outside React, repeated equal payload delivery, and consumer error handling. A state observer remains better served by native `store.sub` or `jotai-effect`.

## Why no effectAtom?

[Jotai-effect](https://jotai.org/docs/extensions/effect) already supplies `observe`, `atomEffect` and `withAtomEffect`. A new name for the same mechanism would increase the API without adding behavior. Use `observe` for a store-owned reactive effect, `withAtomEffect` for a resource whose lifetime follows subscriptions, and `bond` for explicit notification-driven routing.

## Related reading

[Jotai atom](https://jotai.org/docs/core/atom), [selectAtom](https://jotai.org/docs/utilities/select), [splitAtom](https://jotai.org/docs/utilities/split), [async utilities](https://jotai.org/docs/utilities/async), [query integration](https://jotai.org/docs/extensions/query). These tools remain usable directly; holo does not require replacing them with wrappers.

Use [holo](/reference/holo) to connect small Views near their data and keep business workflows in models. Use [modelRegistry](/reference/modelRegistry) when widgets need to select and share instances by key. These choices do not require converting every external library into atoms.

Keep native TanStack Query hooks for React-only consumers, including when createQueryModel already exists elsewhere. Share the QueryClient and options factories; select data at its point of consumption. Use [createQueryModel](/reference/createQueryModel) or [createMutationModel](/reference/createMutationModel) only when the atom/model graph needs them. Native useSuspenseQuery supplies Suspense integration; createQueryModel does not synthesize it.

Keep native RHF for self-contained forms. Use [holoForm](/reference/holoForm) only when atoms or models must react to form state or events. See [Business logic and small Views](/guide/business-logic) for the responsibilities of each layer.

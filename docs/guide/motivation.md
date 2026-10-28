# Why jotai-holo

A profile field needs a name and a change callback. The model updates the name; the View renders the input. `holo` declares which model values and actions become View props.

## From hooks to a binding

Native Jotai is already enough:

```tsx
function NameField() {
  const name = useAtomValue($name);
  const change = useSetAtom(changeName);
  return <NameView name={name} onChange={change} title="Display name" />;
}
```

Use `holo` when this part of the screen deserves its own View and binding. Decomposition is enough reason; the wiring does not need to repeat first:

<<< @/../examples/documentation.tsx#holo

Connect small Views lower in the tree, near the data they display. Move business decisions, commands and synchronization into atom models; keep React responsible for presentation and native UI hooks. This reduces business effects inside components and lets each View render with ordinary props. See [Business logic and small Views](/guide/business-logic) for the architecture and its boundaries.

## Why separate read, write and static?

A writable atom can supply both a value and a callback. A function might be a prop, a React component, or an action. Separate sections make the operation explicit without guessing from runtime object shapes. The same native atom can appear in `read` and `write` under different prop names.

`view` names the React component. `static` means fixed View props. `input` maps committed caller props to model actions.

## A small vocabulary, native semantics

| Need                           | Tool                        | Boundary                                              |
| ------------------------------ | --------------------------- | ----------------------------------------------------- |
| Store values / derived reads   | stateAtom                   | Native atom overloads, including writable derivations |
| Commands / facts               | actionAtom / eventAtom      | Explicit calls, no retained event payload             |
| Combine / project              | ion / prism                 | Jotai dependencies and Object.is                      |
| React to a domain notification | bond                        | Explicit store-owned connection                       |
| Bind / repeat / choose Views   | holo / holoList / holoMatch | Ordinary React props and model ownership              |
| Share a model between widgets  | modelRegistry               | Instance selected by definition, key and store        |

The names use a playful molecular vocabulary. Holo recalls an assembled holoenzyme, and `Re` in the mark stands for React. This is an identity metaphor, not a chemistry model.

## Prior art and reading

[Reflect's motivation](https://reflect.effector.dev/learn/motivation) is the direct inspiration for declaring bindings outside components. Holo applies that idea to Jotai; it does not bring Effector's runtime with it.

[Jotai's performance guide](https://jotai.org/docs/guides/performance) explains why subscription boundaries and cheap renders matter. [React's events and effects guide](https://react.dev/learn/separating-events-from-effects) is useful when deciding whether logic belongs in a command or reactive synchronization. Holo keeps these decisions explicit rather than adding a universal effect abstraction.

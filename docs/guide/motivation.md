# Why jotai-holo

A model knows how data changes. A View knows how data appears. The connection should be visible in one declaration, without a custom hook whose only job is forwarding atom values and setters.

## From hooks to a binding

Native Jotai is already enough:

```tsx
function NameField() {
  const name = useAtomValue($name);
  const change = useSetAtom(changeName);
  return <NameView name={name} onChange={change} title="Display name" />;
}
```

That is a good choice for a small component. When this pattern repeats across a UI, `holo` expresses the same wiring once:

<<< @/../examples/documentation.tsx#holo

The result is useful when you want reusable Views in Storybook, tests using plain props, and subscriptions close to the leaves that display data. It is less useful when a component already owns significant hook-based interaction logic and a separate View would add indirection.

## Why separate state, actions and bindProps?

A writable atom can supply both a value and a callback. A function might be a prop, a React component, or an action. Separate sections make the operation explicit without guessing from runtime object shapes. The same native atom can appear in `state` and `actions` under different prop names.

`core` names the component's role in the assembled binding; `NameView` names its UI role. `bindProps` means fixed View props. `ctx.props` means the inputs available to lifecycle handlers.

## A small vocabulary, native semantics

| Need                           | Tool                        | Boundary                                      |
| ------------------------------ | --------------------------- | --------------------------------------------- |
| Store values / derived reads   | stateAtom                   | Native atoms; use atom for advanced overloads |
| Commands / facts               | actionAtom / eventAtom      | Explicit calls, no retained event payload     |
| Combine / project              | ion / prism                 | Jotai dependencies and Object.is              |
| React to a domain notification | bond                        | Explicit store-owned connection               |
| Bind / repeat / choose Views   | holo / holoList / holoMatch | Ordinary React props and lifecycle            |
| Scoped model identity          | holoMolecule                | Optional Bunshi entry, separate from core     |

The names use a playful molecular vocabulary. Holo recalls an assembled holoenzyme, and `Re` in the mark stands for React. This is an identity metaphor, not a chemistry model.

## Prior art and reading

[Reflect's motivation](https://reflect.effector.dev/learn/motivation) is the direct inspiration for declaring bindings outside components. Holo applies that idea to Jotai; it does not bring Effector's runtime with it.

[Jotai's performance guide](https://jotai.org/docs/guides/performance) explains why subscription boundaries and cheap renders matter. [React's events and effects guide](https://react.dev/learn/separating-events-from-effects) is useful when deciding whether logic belongs in a command or reactive synchronization. Holo keeps these decisions explicit rather than adding a universal effect abstraction.

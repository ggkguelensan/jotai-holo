# Why jotai-holo

A name field needs a value and a change callback. A profile editor also needs
validation, saving and perhaps an independently placed save toolbar. As these
responsibilities grow, it becomes harder to see which code draws the screen and
which code decides how the profile works.

holo gives the React View ordinary props while keeping its atom subscriptions
and commands in a declaration next to the View.

## Move the binding out of the View {#from-hooks-to-a-binding}

A component can read the name with `useAtomValue` and obtain a change callback
with `useSetAtom`. That is a valid Jotai binding. With holo, the same choice of
sources is visible in one place:

```tsx
export const NameField = holo({
  view: NameView,
  read: { name: $name },
  write: { onChange: changeName },
  static: { title: 'Display name' },
});
```

This declaration comes from the
[profile example](https://github.com/ggkguelensan/jotai-holo/blob/main/examples/documentation.tsx).
`NameView` receives a string, a callback and a title. It can be rendered in a
story without creating a store. The binding chooses the atoms; the View chooses
the markup.

You do not need repeated wiring to justify this separation. It is useful whenever
a piece of the screen deserves a small View with a clear input contract.

## Keep subscriptions near the fields that need them

Suppose a profile page has a name field, an avatar and a save toolbar. A parent
that reads the whole draft must pass values and callbacks through the page.
Instead, each small View can connect to the atoms it needs. The page can remain
a layout component.

The name field reads the name. The toolbar reads whether saving is allowed.
They can use the same state without making the layout subscribe to it.
Unrelated changes need not render every connected View.

This still requires choosing suitable atoms. If every field reads an atom that
returns the whole draft object, changing that object changes every field's input.
Use separate derived atoms or `prism` when consumers need independent values.

## Make the direction of each connection visible {#why-separate-read-write-and-static}

The sections in the binding describe different directions:

- `read`: an atom's value goes to a View prop.
- `write`: a View callback writes to an atom.
- `static`: a fixed value goes to a View prop.
- `input`: a parent prop is forwarded to an atom after React commits it.
- `imperative`: an external event reaches a method implemented inside the View.

A writable atom can appear in both `read` and `write`. The field names say how
holo uses it; its runtime shape does not have to imply that choice.

See [holo and small Views](/topics/holo) for the complete workflow.

## Introduce models when the business needs them {#a-small-vocabulary-native-semantics}

A model can begin as a record of related atoms and commands. A profile model
might hold the draft, calculate whether it is valid and expose a save command.
The name field and toolbar can then use that same record.

A model does not need a registry just to group atoms. Add a factory when you
need to create independent records, and a registry when components need to
select shared instances by key. See [atoms and models](/topics/atoms-and-models).

holo also does not require every value to enter Jotai. Keep local interaction in
React when no model needs it. Use native TanStack Query hooks for UI-only server
data and native RHF for UI-only form state. Add their atom integrations when
business calculations or commands need to participate.

## What changes in application code

Business commands decide which changes are valid. Connections synchronize
models or subscribe to external sources. Views keep markup, accessibility and
UI-specific hooks. holo connects the two sides.

That separation removes many forwarding effects from Views, but it does not
remove side effects from the application. Their lifetime and error handling
still need an owner. The [architecture article](/guide/architecture) explains
where that work belongs.

## Prior art and reading

[Reflect's motivation](https://reflect.effector.dev/learn/motivation) inspired
bindings declared outside components. holo uses that idea with Jotai atoms.

[Jotai's performance guide](https://jotai.org/docs/guides/performance) explains
small subscription boundaries.
[React's events and effects guide](https://react.dev/learn/separating-events-from-effects)
helps distinguish a command from synchronization that follows changing state.

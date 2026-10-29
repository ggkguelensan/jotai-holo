# Getting started

Connect a player profile name field to Jotai. The field will receive a string and a
callback, just as it would from a parent component. `holo` supplies those props
from atoms.

You do not need a model registry or a holo-specific Provider for this example.

## Availability and requirements

The package is not yet published to npm. To run the examples, clone the
repository:

```sh
git clone https://github.com/ggkguelensan/jotai-holo.git
cd jotai-holo
corepack enable
pnpm install --frozen-lockfile
pnpm examples
```

Check the [tested compatibility matrix](/compatibility) for supported Node,
React, Jotai and TypeScript versions.

## Start with an ordinary View {#bind-a-view-once}

The name field renders the value it receives. When the user types, it calls
`onChange`. It does not import atoms or subscribe to a store.

<<< @/../examples/quickstart.tsx#quickstart-view

You can render this View directly in a test or story by passing a name and an
`onChange` callback.

## Give the field a value

Create an atom outside React render. It holds the name that this field edits:

<<< @/../examples/quickstart.tsx#quickstart-state

Import `stateAtom` and `holo` from `jotai-holo`. `stateAtom` has the native Jotai
`atom` API. Existing Jotai atoms work too; you do not need to replace them.

## Connect the props

<<< @/../examples/quickstart.tsx#quickstart-binding

The example app renders `<NameField />` under “Getting started”. Open the URL printed by `pnpm examples` and edit the `Ada` field:

1. `read` supplies the atom's value, initially `Ada`, as the `name` prop.
2. `write` supplies a callback as `onChange`.
3. Typing calls that callback, writes the new name to the atom and updates the
   displayed value.

The same writable atom appears in both sections: `read` reads its value and
`write` writes to it. No extra command is needed for this direct update.

If a View prop is not supplied by the binding, the parent still passes it
normally. Declare `NameField` outside React render so its component identity
stays stable.

## Choose which components share the value {#store-ownership}

Two `NameField` components using the same Jotai store edit the same name. Jotai's
`Provider` can give a subtree a separate store. Without one, Jotai uses its default
store. holo needs no additional Provider.

For SSR, create a separate store per request. The atom declarations can be shared
between requests; user-specific values must not share one server store.

## When you need another draft {#shared-models-and-external-resources}

This example has one atom. If two editors need independent drafts, create
their atoms in a factory. If independently placed components need to find the
same draft by ID, add a registry. Neither is required for a simple binding.

Continue with [why use holo](/guide/motivation), then
[atoms and models](/topics/atoms-and-models). For an existing project, the
[holo topic](/topics/holo) explains input props and external events.

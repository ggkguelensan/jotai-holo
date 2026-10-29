# Getting started

Connect an input to an atom. The View receives a value and an `onChange` callback; holo connects them to Jotai.

<span id="availability-and-requirements"></span>

## Run the example

The package is not yet published to npm. Run the example from the repository:

```sh
git clone https://github.com/ggkguelensan/jotai-holo.git
cd jotai-holo
corepack enable
pnpm install --frozen-lockfile
pnpm examples
```

Open the URL printed in the terminal. The name field appears under “Getting started”. See [compatibility](/compatibility) for supported versions.

## 1. Define the View {#bind-a-view-once}

The View renders its props and calls `onChange` when the user types. It does not need to know where the value is stored.

<<< @/../examples/quickstart.tsx#quickstart-view

<span id="give-the-field-a-value"></span>

## 2. Create the state

Import `stateAtom` and `holo` from `jotai-holo`. Create the atom outside React render:

<<< @/../examples/quickstart.tsx#quickstart-state

`stateAtom` uses the native Jotai atom API. An existing Jotai atom works too.

<span id="connect-the-props"></span>

## 3. Connect the View

<<< @/../examples/quickstart.tsx#quickstart-binding

`read` passes the atom's value as `name`. `write` creates the `onChange` callback that writes to the same atom. Type in the field: the atom changes and the View shows the new value.

Declare `NameField` outside React render. Props not supplied by holo are passed by the parent as usual.

## Sharing state {#store-ownership}

Two `NameField` components in the same Jotai store share the value. A Jotai `Provider` gives a subtree its own store; without it, Jotai uses the default store. holo needs no additional Provider. For SSR, use a separate store per request.

<span id="shared-models-and-external-resources"></span>

This binding needs no model or registry. Continue with [atoms and models](/topics/atoms-and-models) when you need independent state or instances shared by ID.

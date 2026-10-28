# Getting started

Start with a View that accepts props and a Jotai model that changes data. `holo` connects them in one declaration. Existing Jotai atoms work directly.

## Availability and requirements

This API is not yet published to npm. Clone the repository to try the examples.

Use Node 22.12+, React 18 or 19, Jotai 3.0.1+ within v3, and TypeScript 5.9+ with `strict`. See the [tested compatibility matrix](/compatibility).

```sh
git clone https://github.com/ggkguelensan/jotai-holo.git
cd jotai-holo
corepack enable
pnpm install --frozen-lockfile
pnpm examples
```

## Bind a View once

<<< @/../examples/documentation.tsx#state
<<< @/../examples/documentation.tsx#action
<<< @/../examples/documentation.tsx#prism
<<< @/../examples/documentation.tsx#holo

Render `<NameField />`. Its View receives a name, a title and a callback. `read` supplies values, `write` supplies callbacks, and `static` supplies fixed props. Declare `holo` outside React render; any unbound View props remain inputs to the connected component.

The snippets come from one TypeScript-checked example. Import helpers from `jotai-holo`, or use `jotai-holo/vanilla` for model code that does not need React.

## Store ownership

Use Jotai's `<Provider store={store}>` to isolate a widget or application. Without a Provider, Jotai uses its default store. Create a separate store per SSR request; never reuse request data in a global server store. Atom definitions can be shared; their values belong to the store.

No Provider specific to holo is required. Basic bindings need no `connect`. Use [bond](/reference/bond) for event reactions. Its connections require explicit ownership and disposal.

Continue with [why this API](/guide/motivation), the [profile workflow](/recipes/profile), or [holo reference](/reference/holo).

## Shared models and external resources

Use [modelRegistry](/reference/modelRegistry) when several widgets need one model. The same definition, key and store select the same instance. Without a key, they select the default instance. Query and form bindings have separate entries, `jotai-holo/query` and `jotai-holo/rhf`.

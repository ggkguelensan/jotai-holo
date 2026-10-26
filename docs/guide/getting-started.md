# Getting started

jotai-holo connects native Jotai models to ordinary React components. Start with `holo`; add model helpers only where they improve readability. Existing atoms work without migration.

## Availability and requirements

This branch is an unreleased implementation, not an npm release announcement. The examples describe the checked-out source. Until a release is published, use the repository locally; do not assume `pnpm add jotai-holo` installs this API.

Use Node 22.12+, React 18 or 19, Jotai 3.0.1+ within v3, and TypeScript 5.9+ with `strict`. See the [tested compatibility matrix](/compatibility).

```sh
git clone https://github.com/ggkguelensan/jotai-holo.git
cd jotai-holo
git switch docs/reference-site
corepack enable
pnpm install --frozen-lockfile
pnpm examples
```

## Bind a View once

<<< @/../examples/documentation.tsx#state
<<< @/../examples/documentation.tsx#action
<<< @/../examples/documentation.tsx#prism
<<< @/../examples/documentation.tsx#holo

Render `<NameField />`. The View takes strings and callbacks; it knows nothing about Jotai. `state` reads atoms, `actions` writes them, and `bindProps` supplies fixed values. Declare the binding outside React render. Unbound View props remain public component props.

These snippets share one TypeScript-checked source file; import the named helpers from `jotai-holo`. Model-only code can import `jotai-holo/vanilla`. The optional Bunshi binding is available from `jotai-holo/bunshi`.

## Store ownership

Use Jotai's `<Provider store={store}>` to isolate a widget or application. Without a Provider, Jotai uses its default store. Create a separate store per SSR request; never reuse request data in a global server store. Atom definitions can be shared; their values belong to the store.

No Provider specific to holo is required. Basic bindings need no `connect`. Only [bond](/reference/bond) and [external event subscriptions](/reference/subscribeEvent) require explicit ownership and disposal.

Continue with [why this API](/guide/motivation), the [profile workflow](/recipes/profile), or [holo reference](/reference/holo).

## Shared models and external resources

Use [createModel](/reference/createModel) for models shared between widgets. A definition/key/store identifies one instance; omitting the key selects default. Import the registry from `jotai-holo/model`, Query from `jotai-holo/query`, and forms from `jotai-holo/rhf`. These optional entries stay outside ordinary atom bindings.

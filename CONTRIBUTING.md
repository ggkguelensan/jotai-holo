# Development

Use Node 22.19+ for the development toolchain including Lingui (CI runs Node 22 and 24; the published library requires 22.12+), Corepack and the package manager pinned in package.json.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` builds ESM/types, checks source and type-negative fixtures, runs unit/compatibility/Chromium suites, then builds the example application. `pnpm examples` starts the examples locally. Rendering tests use real React DOM in Chromium rather than mocked hooks. Counters measure core calls around controlled updates, including unrelated writes, selected state and fulfilled async state.

Keep public exports aligned with [the API documentation](docs/api.md) and [operator contracts](docs/operators.md). Use native Jotai atoms for advanced reads/writes. Keep optional integrations behind separate entry points; Query and RHF implementations must remain absent from the core runtime and declaration graphs. Never create `holo()` within a React render.

Before a release, run `pnpm check`, `pnpm test:package`, `pnpm test:model-memory` and inspect `pnpm pack`. Run `pnpm size` when changing runtime imports or bundle-sensitive code. The package is ESM only and preserves React client directives. Publishing is a separate maintainer action; CI does not publish to npm.

## Documentation

Run `pnpm docs:dev` for the English, Russian, German and Kazakh site. English Markdown is canonical. Run `pnpm i18n:extract` after text changes and translate `msgstr` entries in `docs/.vitepress/i18n/locales/{locale}/{docs,ui}.po`. Localized Markdown and compiled catalogs are generated and ignored by Git. Keep shared code in checked VitePress snippet regions. `docs:dev`, `docs:check` and `docs:build` prepare translations automatically at startup; run `pnpm docs:prepare` again after editing catalogs in a running dev session. Strict compilation rejects missing translations. Run `pnpm docs:check` and `pnpm docs:build`; TypeScript and unit tests also validate the profile recipe. Static output and manual GitHub Pages setup are described in [hosting the docs](docs/guide/hosting.md).

Live documentation demos use real React/Jotai bindings from standalone modules in `examples/docs/`. Declare atoms, Views and holo bindings at module scope, separated by blank lines; separate groups of different atom/operator types. Read translations inside Views with `const { t } = useLingui()` from `@lingui/react/macro`, using tagged messages such as ``t`Quantity` ``. The docs build runs the official Lingui Babel macro plugin; React messages use the official Lingui extractor and generated IDs. Preview providers and store initialization belong in the documentation shell, outside displayed snippets. The Vue shell mounts them only on the client and unmounts on route changes. Keep each demo store isolated; `pnpm test:docs` verifies real controls, subscription disposal, model isolation, locale navigation and mobile layout.

Run `pnpm test:react` after changing bindings or compatibility code. It tests the packed library with isolated React 18.0.0, 18.3.1 and 19.3.1 consumers in development/production, with SSR and per-major React typings. Use `REACT_VERSION=<version>` to select one. Keep React 19-specific APIs out of shared runtime imports.

## Editorial approach

Write for a developer solving a concrete task. Start each page with that task and the resulting behavior, then show a runnable example. Explain the mechanism before its edge cases. Keep one idea per paragraph, name the actor, and use verbs instead of abstract nouns. Preserve constraints on ownership, async work, equality and cleanup. Link to alternatives where they help a decision; remove comparisons with retired designs. Keep English, Russian, German and Kazakh aligned through Lingui.

This applies the reader focus and example-led explanations discussed in [«Пиши, сокращай»](https://sokratil.ru/) and [«Ясно, понятно»](https://mc.today/kak-ne-opozoritsya-v-perepiske-na-peregovorah-i-v-sotssetyah-sovety-maksima-ilyahova-v-novoj-knige-yasno-ponyatno/) (authorized excerpt). It is an editorial guide, not a rule to shorten necessary technical detail.

## Model composition and analytics

Model modifiers use one ownership protocol. Only explicitly managed declarations activate; returning an ordinary atom must not subscribe to it. Keep registry record identity when decorating an existing definition, and isolate engine clients by store. Run `pnpm test:composition-memory` after ownership changes. `pnpm test:analytics-adapter` checks the optional adapter against the SDK pinned in `design/analytics/validation.json` without executing SDK code or sending analytics. See [runtime contracts](docs/runtime.md) and the [adapter authoring prompt](docs/analytics-adapter-prompt.md).

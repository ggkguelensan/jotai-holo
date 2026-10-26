# Development

Use Node 22.19+ for the development toolchain including Lingui (CI runs Node 22 and 24; the published library requires 22.12+), Corepack and the package manager pinned in package.json.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` builds ESM/types, checks source and type-negative fixtures, runs unit/compatibility/Chromium suites, then builds the example application. `pnpm examples` starts the examples locally. Rendering tests use real React DOM in Chromium rather than mocked hooks. Counters measure core calls around controlled updates, including unrelated writes, selected state and fulfilled async state.

Keep public exports aligned with [the API documentation](docs/api.md) and [operator contracts](docs/operators.md). Use native Jotai atoms for advanced reads/writes. Keep optional integrations behind separate entry points; Bunshi, Query and RHF implementations must remain absent from the core runtime and declaration graphs. Never create `holo()` within a React render.

Before a release, run `pnpm check`, `pnpm test:package`, `pnpm test:memory`, `pnpm test:model-memory` and inspect `pnpm pack`. Run `pnpm size` when changing runtime imports or bundle-sensitive code. The package is ESM only and preserves React client directives. Publishing is a separate maintainer action; CI does not publish to npm.

## Documentation

Run `pnpm docs:dev` for the English, Russian, German and Kazakh site. English Markdown is canonical. Run `pnpm i18n:extract` after text changes and translate `msgstr` entries in `docs/.vitepress/i18n/locales/{locale}/{docs,ui}.po`. Localized Markdown and compiled catalogs are generated and ignored by Git. Keep shared code in checked VitePress snippet regions. `docs:dev`, `docs:check` and `docs:build` prepare translations automatically at startup; run `pnpm docs:prepare` again after editing catalogs in a running dev session. Strict compilation rejects missing translations. Run `pnpm docs:check` and `pnpm docs:build`; TypeScript and unit tests also validate the profile recipe. Static output and manual GitHub Pages setup are described in [hosting the docs](docs/guide/hosting.md).

Live documentation demos use real React/Jotai bindings from `examples/docs-demos.tsx`, `examples/docs-infrastructure.tsx` and the optional Bunshi demo. The Vue shell mounts them only on the client and unmounts on route changes. Keep each demo store isolated; `pnpm test:docs` verifies real controls, subscription disposal, scope sharing, locale navigation and mobile layout.

Run `pnpm test:react` after changing bindings or compatibility code. It tests the packed library with isolated React 18.0.0, 18.3.1 and 19.3.1 consumers in development/production, with SSR and per-major React typings. Use `REACT_VERSION=<version>` to select one. Keep React 19-specific APIs out of shared runtime imports.

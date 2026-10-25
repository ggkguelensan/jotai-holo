# Development

Use a supported Node version (22.12+; CI runs Node 22 and 24), Corepack and the package manager pinned in package.json.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` builds ESM/types, checks source and type-negative fixtures, runs unit/compatibility/Chromium suites, then builds the example application. `pnpm examples` starts the examples locally. Rendering tests use real React DOM in Chromium rather than mocked hooks. Counters measure core calls around controlled updates, including unrelated writes, selected state and fulfilled async state.

Keep public exports aligned with [the API documentation](docs/api.md) and [operator contracts](docs/operators.md). Use native Jotai atoms for advanced reads/writes. Keep optional integrations behind separate entry points; Bunshi must remain absent from the core runtime and declaration graphs. Never create `holo()` within a React render.

Before a release, run `pnpm check`, `pnpm test:package`, `pnpm test:memory` and inspect `pnpm pack`. Run `pnpm size` when changing runtime imports or bundle-sensitive code. The package is ESM only and preserves React client directives. Publishing is a separate maintainer action; CI does not publish to npm.

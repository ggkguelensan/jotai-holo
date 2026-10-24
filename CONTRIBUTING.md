# Development

Use a supported Node version (22.12+; CI runs Node 22 and 24), Corepack and the package manager pinned in package.json.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` builds ESM/types, checks source and type-negative fixtures, runs unit/compatibility/Chromium suites, then builds the example application. `pnpm examples` starts the examples locally. Rendering tests use real React DOM in Chromium rather than mocked hooks. Counters measure core calls around controlled updates, including unrelated writes, selected state and fulfilled async state.

Keep the root value exports to the three documented helpers. Use native Jotai atoms for advanced reads/writes. Keep optional integrations in examples unless a tested problem requires another public interface. Never create `holo()` within a React render.

Before a release, run `pnpm check`, `pnpm test:package` and inspect `pnpm pack`. The package is ESM only and preserves React client directives. Publishing is a separate maintainer action; CI does not publish to npm.

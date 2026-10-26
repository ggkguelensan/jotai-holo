# Production bundle measurements

Measured from the store-owned infrastructure implementation on 2026-10-26 with the versions pinned in package.json/pnpm-lock.yaml. Vite 8.0.13, React/React DOM 19.3.1, Jotai 3.0.1; production Oxc minification, ES2022 target. Gzip level 9, Brotli quality 11. These are JavaScript measurements, excluding maps, HTML and tarball size.

## Additional JavaScript in React + Jotai

Equivalent native and connected counter applications include React, React DOM and Jotai in both bundles. These figures subtract the complete compressed baseline application from each variant.

| Variant                               | Minified bytes | gzip bytes | Brotli bytes |
| ------------------------------------- | -------------: | ---------: | -----------: |
| Helpers, root import                  |            313 |        115 |           -9 |
| Helpers, vanilla import               |            313 |        115 |           -9 |
| holo with native atoms                |          6,524 |      2,300 |        1,920 |
| holo with helpers                     |          6,837 |      2,411 |        2,124 |
| holo with helpers, preexisting unwrap |          6,099 |      2,122 |        1,867 |

Baseline application: **226,797 | 70,500 | 60,957 bytes** (minified / gzip / Brotli). Plain holo adds **2,300 gzip bytes**; registry, Query and RHF implementations are absent. Root imports do not force unused operators into the application.

## Publishing helpers

The fixture uses native hooks, an explicit store, primitive/derived state, an increment action and a notification write. Only the named factory changes. The subscription variant also includes application listener setup and pagehide disposal.

| Variant              | Minified bytes | gzip bytes | Brotli bytes |
| -------------------- | -------------: | ---------: | -----------: |
| stateAtom            |             99 |         44 |          126 |
| actionAtom           |            214 |         85 |           72 |
| eventAtom            |            234 |         87 |          145 |
| stateAtom+actionAtom |            313 |        123 |           90 |
| all-three            |            329 |        117 |          149 |
| all-three+subscribe  |          1,445 |        573 |          562 |

EventAtom stays a thin actionAtom wrapper; the listener/queue runtime is imported by consumers through bond or subscribeEvent. The script asserts that publisher-only imports exclude that runtime.

## Optional entry points with peers external

These figures compress isolated library exports, with React, Jotai, query-core and RHF external. They **do not** include those dependencies and are **not** incremental whole-application deltas. A subset can remove unused code even inside one optional entry.

| Variant                                       | Minified bytes | gzip bytes | Brotli bytes |
| --------------------------------------------- | -------------: | ---------: | -----------: |
| All five scalar operators                     |            653 |        334 |          293 |
| createModel                                   |          3,465 |      1,485 |        1,339 |
| queryAtoms + queryClientAtom                  |          1,403 |        723 |          656 |
| formAtom only                                 |            884 |        483 |          424 |
| createFormModel only (includes registry)      |          4,189 |      1,756 |        1,576 |
| holoForm only (includes ordinary holo)        |          6,565 |      2,687 |        2,449 |
| All form utilities (includes holo + registry) |         11,338 |      4,385 |        3,963 |

The all-form row already contains holo and the model registry. Do not add those rows together. FormAtom-only imports contain neither holo nor the registry. The Query entry reuses prism/readSource and talks directly to QueryObserver; it contains no atomWithQuery adapter. Zod and resolvers are application/example dependencies and never enter the library runtime.

## Cage and complete root

| Variant                                | Minified bytes | gzip bytes | Brotli bytes |
| -------------------------------------- | -------------: | ---------: | -----------: |
| Cage application increment             |          1,311 |        389 |          355 |
| All root exports, React/Jotai external |         10,854 |      4,142 |        3,806 |

A measurement-only transform removes cage wiring for the cage comparison. Ordinary holo still includes its lifecycle capability even if no handlers are configured. The complete-root row preserves every runtime root export, unlike a typical tree-shaken application.

## Tree shaking and reproducibility

- Helper-only root and vanilla imports produce identical output, without React bindings.
- Unused scalar operators, bond, events, prism, ion and branch/list adapters are removed from ordinary counter fixtures.
- Ordinary holo imports the small model-binding protocol, but not registry construction, timers, Query or RHF.
- Optional Query and RHF code is reachable only through its separate entry point.
- Publisher-only imports exclude subscription queues and listener error handling.

```sh
pnpm install --frozen-lockfile
pnpm size
```

[The measurement script](../scripts/measure-bundle.mjs) builds compiled dist fixtures, checks their module graphs and prints JSON. BUNDLE_SOURCE_COMMIT optionally labels the revision. Compression dictionaries, minification and chunk splitting affect application deltas; figures are not additive or a byte guarantee for every application.

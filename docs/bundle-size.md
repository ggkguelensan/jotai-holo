# Production bundle measurements

Measured against library source commit `0778289`, using Vite 8.0.13, React/React DOM 19.3.1, Jotai 3.0.1 and target ES2022. The measurements use the actual compiled `dist` entry points, production mode and Oxc minification.

## Additional JavaScript in an existing React + Jotai app

The fixture renders the same counter view, count, derived double value and increment action. The baseline connects it with native Jotai hooks. The holo variant connects it declaratively. Each build emits one JavaScript chunk; React, React DOM and Jotai are included in both builds.

| Variant                                     | Additional minified bytes | Additional gzip bytes | Additional Brotli bytes |
| ------------------------------------------- | ------------------------: | --------------------: | ----------------------: |
| Only stateAtom/actionAtom, root import      |                       133 |                    45 |                      13 |
| Only stateAtom/actionAtom, vanilla import   |                       133 |                    45 |                      13 |
| holo with native atoms                      |                     3,166 |                 1,144 |                     972 |
| holo + stateAtom/actionAtom                 |                     3,299 |                 1,185 |                   1,038 |
| holo + helpers, when unwrap is already used |                     2,561 |                   895 |                     784 |

The ordinary baseline totals **226,797 minified / 70,500 gzip / 60,957 Brotli bytes**. With holo and helpers it totals **230,096 / 71,685 / 61,995 bytes**. The baseline that already uses unwrap totals **227,539 / 70,795 / 61,186 bytes**; its paired holo build totals **230,100 / 71,690 / 61,970 bytes**.

Compression uses gzip level 9 and Brotli quality 11. These are differences between compressed **whole app bundles**, not the compressed size of the library considered independently. Shared compression dictionaries and minifier choices affect the difference, especially for tiny helpers. Treat these as a reproducible fixture result, not an exact byte guarantee for every application.

## Cost of cage

A measurement-only build transform removes the cage import, lifecycle implementation wiring and the cage option from `holo`. Project sources and the actual shipped interface stay unchanged. Both variants render the same counter without configuring any cage handlers.

| Variant | Minified bytes | gzip bytes | Brotli bytes |
| --- | ---: | ---: | ---: |
| Current holo + helpers app | 230,096 | 71,685 | 61,995 |
| Same app with cage implementation removed | 228,798 | 71,297 | 61,583 |
| **Difference attributable to cage** | **1,298** | **388** | **412** |

In this fixture, cage accounts for about **33% of the 1,185-byte gzip app increment**. Without it, the library's app increment would be **2,001 minified / 797 gzip / 626 Brotli bytes**. This is a hypothetical implementation variant used only for measurement; the current holo entry includes cage even when no handlers are configured.

These are differences between compressed complete bundles, so the Brotli delta can be larger than the gzip delta despite a smaller total Brotli bundle. The measurement script checks that the emitted module graph actually loses `holo-cage.js` in this variant.

## Standalone library with peers external

For a separate measurement, all three public exports are preserved and React plus every `jotai/*` import are external:

| Minified bytes | gzip bytes | Brotli bytes |
| -------------: | ---------: | -----------: |
|          2,706 |      1,204 |        1,109 |

This excludes Jotai's unwrap implementation and includes external import/export statements. It is a different measurement from the app delta above; the numbers should not be added together.

## Tree shaking

The emitted module graph confirms:

- Importing only the helpers from the root includes `state-atom.js` and `action-atom.js`; holo, aggregation and cage are removed.
- Root and vanilla helper imports produce identical app sizes in this fixture.
- Using holo includes its aggregation and cage implementations, even when no cage handlers are configured.
- Bunshi, jotai-effect, RxJS and jotai-eager do not enter these bundles.

The implementation cost is shared by connected components in the same bundle/shared chunk. Application-specific model and binding declarations still contribute their own code. Exact output in a real project depends on its bundler, other Jotai utility imports and chunk splitting.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm size
```

[`scripts/measure-bundle.mjs`](../scripts/measure-bundle.mjs) generates temporary fixtures inside the worktree, builds every variant with the same settings, checks the included modules and prints byte counts as JSON. It removes the fixtures afterward. An optional `BUNDLE_SOURCE_COMMIT` environment variable labels the source revision in that output. The script measures JavaScript only; HTML, source maps and package tarball size are excluded.

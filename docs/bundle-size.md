# Production bundle measurements

Measured on the atom-selection adapter and model/view operators implementation using Vite 8.0.13, React/React DOM 19.3.1, Jotai 3.0.1 and Bunshi 2.2.0. Builds use the compiled `dist` entry points, production mode, Oxc minification and target ES2022.

## Additional JavaScript in React + Jotai

Native and holo fixtures render the same counter. React, React DOM and Jotai are included in both whole-app bundles.

| Variant                                 | Additional minified bytes | Additional gzip bytes | Additional Brotli bytes |
| --------------------------------------- | ------------------------: | --------------------: | ----------------------: |
| Only helpers, root import               |                       704 |                   289 |                     159 |
| Only helpers, vanilla import            |                       704 |                   289 |                     159 |
| holo with native atoms                  |                     5,097 |                 1,811 |                   1,533 |
| holo + helpers                          |                     5,801 |                 2,097 |                   1,837 |
| holo + helpers, with preexisting unwrap |                     5,063 |                 1,805 |                   1,640 |

Baseline app: **226,797 / 70,500 / 60,957 bytes** (minified / gzip / Brotli). With holo and helpers: **232,598 / 72,597 / 62,794 bytes**.

Ordinary holo with native atoms adds **1,811 gzip bytes** and has no Bunshi dependency. The generic binding protocol supports optional adapters without importing them. Helper-only fixtures add **289 gzip bytes**; actionAtom includes the event channel/dispatch support required by bond. The root's unused model and view operators do not enter these counter bundles. Before event observation, the adapter + helper fixture added 1,849 gzip bytes; the current fixture adds 2,097.

## Application already using Bunshi

Both fixtures construct the same model in a molecule. The control calls native useMolecule/useAtomValue/useSetAtom; the adapter uses holoMolecule(Model) and atom selectors in holo. Neither fixture uses stateAtom/actionAtom.

| Variant                         | Minified bytes | gzip bytes | Brotli bytes |
| ------------------------------- | -------------: | ---------: | -----------: |
| Native Bunshi + Jotai           |        235,960 |     73,655 |       63,763 |
| holo + molecule binding adapter |        241,197 |     75,434 |       65,264 |
| Additional cost                 |          5,237 |      1,779 |        1,501 |

## Cage and standalone library

A measurement-only transform removes cage wiring from the ordinary holo + helpers fixture. Cage contributes **1,319 / 404 / 454 bytes** (minified / gzip / Brotli). It remains included even without configured handlers. The script checks that the transformed module graph loses `holo-cage.js`.

Preserving all eight runtime root exports with React/Jotai external produces **8,298 / 3,264 / 2,998 bytes**. This includes the model operators and view adapters and excludes peer implementations; do not add it to app deltas. Bunshi's optional entry is measured separately above.

## Tree shaking

- Helper-only root and vanilla imports have identical output; no binding, holo or aggregation modules remain.
- Ordinary holo includes the generic binding protocol and async handling, but no Bunshi code.
- Unused bond, ion, prism, holoList and holoMatch modules are removed from ordinary counter fixtures.
- Only the molecule-adapter fixture includes Bunshi.
- jotai-effect, RxJS and jotai-eager remain absent.

Compression uses gzip level 9 and Brotli quality 11. App deltas compare compressed complete bundles, so shared dictionaries, minification and chunk splitting affect the result. These figures are reproducible fixtures, not a byte guarantee for every app.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm size
```

[The measurement script](../scripts/measure-bundle.mjs) creates temporary fixtures, checks module graphs and prints JSON results, then removes the fixtures. `BUNDLE_SOURCE_COMMIT` optionally labels a revision. HTML, source maps and package tarball size are excluded.

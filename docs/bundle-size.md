# Production bundle measurements

Measured on the thin publishing atoms and consumer-owned event delivery implementation using Vite 8.0.13, React/React DOM 19.3.1, Jotai 3.0.1 and Bunshi 2.2.0. Builds use the compiled dist entry points, production mode, Oxc minification and target ES2022.

## Additional JavaScript in React + Jotai

Native and holo fixtures render the same counter. React, React DOM and Jotai are included in both whole-app bundles.

| Variant                                 | Additional minified bytes | Additional gzip bytes | Additional Brotli bytes |
| --------------------------------------- | ------------------------: | --------------------: | ----------------------: |
| Only helpers, root import               |                       313 |                   115 |                      -9 |
| Only helpers, vanilla import            |                       313 |                   115 |                      -9 |
| holo with native atoms                  |                     5,097 |                 1,811 |                   1,533 |
| holo + helpers                          |                     5,410 |                 1,932 |                   1,733 |
| holo + helpers, with preexisting unwrap |                     4,672 |                 1,640 |                   1,451 |

Baseline app: **226,797 / 70,500 / 60,957 bytes** (minified / gzip / Brotli). With holo and helpers: **232,207 / 72,432 / 62,690 bytes**.

Ordinary holo with native atoms adds **1,811 gzip bytes** and has no Bunshi dependency. ActionAtom includes only a minimal per-store publication port. Queues, listeners and listener error handling belong to bond/subscribeEvent and are absent from publisher-only imports. Root and vanilla helper imports have identical output.

## Individual state, action and event helpers

The helper fixture uses native React/Jotai hooks with an explicit store, primitive and derived state, an increment action and a notification write. Its baseline uses native atom factories throughout. Each variant replaces only the named factories. These figures exclude holo and bond, and count React/Jotai in both app bundles.

| Factories used                    | Additional minified bytes | Additional gzip bytes |
| --------------------------------- | ------------------------: | --------------------: |
| stateAtom                         |                        99 |                    44 |
| actionAtom                        |                       214 |                    85 |
| eventAtom                         |                       234 |                    87 |
| stateAtom + actionAtom            |                       313 |                   123 |
| All three                         |                       329 |                   117 |
| All three + external subscription |                     1,445 |                   573 |

EventAtom is a thin wrapper over actionAtom. It has no subscribe method. Subscription ownership and FIFO delivery are separate code imported through subscribeEvent or bond. The script asserts that publisher-only variants contain neither event-dispatch.js nor subscribe-event.js. The subscription row also includes application code that registers a listener and a pagehide disposer; it is not an isolated subscription-runtime measurement. Shared code and compressed bundle dictionaries mean individual deltas must not be added together.

For comparison, preserving just the named factory exports with React/Jotai external gives these independent library bundles. Their gzip figures compress the small library chunk alone rather than subtracting two complete app bundles:

| Exports preserved | Minified bytes | gzip bytes |
| ----------------- | -------------: | ---------: |
| stateAtom         |            152 |        131 |
| actionAtom        |            272 |        203 |
| eventAtom         |            295 |        210 |
| All three         |            418 |        258 |

## Application already using Bunshi

Both fixtures construct the same model in a molecule. The control calls native useMolecule/useAtomValue/useSetAtom; the adapter uses holoMolecule(Model) and atom selectors in holo. Neither fixture uses stateAtom/actionAtom.

| Variant                         | Minified bytes | gzip bytes | Brotli bytes |
| ------------------------------- | -------------: | ---------: | -----------: |
| Native Bunshi + Jotai           |        235,960 |     73,655 |       63,763 |
| holo + molecule binding adapter |        241,197 |     75,434 |       65,264 |
| Additional cost                 |          5,237 |      1,779 |        1,501 |

## Cage and standalone library

A measurement-only transform removes cage wiring from the ordinary holo + helpers fixture. Cage contributes **1,319 / 411 / 424 bytes** (minified / gzip / Brotli). It remains included even without configured handlers. The script checks that the transformed module graph loses holo-cage.js.

Preserving all ten runtime root exports with React/Jotai external produces **8,875 / 3,463 / 3,193 bytes**. This includes model operators, subscribeEvent and view adapters, and excludes peer implementations; do not add it to app deltas. Bunshi's optional entry is measured separately above.

## Tree shaking

- Helper-only root and vanilla imports have identical output; no binding, holo or aggregation modules remain.
- Publisher-only stateAtom/actionAtom/eventAtom imports exclude subscription and queue runtime.
- Ordinary holo includes the generic binding protocol and async handling, but no Bunshi code.
- Unused eventAtom, bond, ion, prism, holoList and holoMatch modules are removed from ordinary counter fixtures.
- Only the molecule-adapter fixture includes Bunshi.
- jotai-effect, RxJS and jotai-eager remain absent.

Compression uses gzip level 9 and Brotli quality 11. App deltas compare compressed complete bundles, so shared dictionaries, minification and chunk splitting affect the result. Even a negative compressed delta can occur while minified code grows. These figures are reproducible fixtures, not a byte guarantee for every app.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm size
```

[The measurement script](../scripts/measure-bundle.mjs) creates temporary fixtures, checks module graphs and prints JSON results, then removes the fixtures. BUNDLE_SOURCE_COMMIT optionally labels a revision. HTML, source maps and package tarball size are excluded.

## React 18 compatibility increment

Compared with `9599e77` using the same pinned React 19 application fixtures and Vite configuration, the React 18 compatibility layer adds **408 minified bytes / 148 gzip bytes** to the ordinary holo fixture and **409 minified bytes / 117 gzip bytes** to the Bunshi fixture. These are changes to complete application bundles, not isolated module sizes. Publisher/model-only helper fixtures remain byte-for-byte unchanged. Compression deltas depend on the surrounding application and are not additive.

# Bundle measurements

Run `pnpm size` to build equivalent counter applications with and without holo. The script reports minified, gzip and Brotli bytes, included modules, and differences from the native React/Jotai application.

Fixtures cover ordinary bindings, helper atoms, committed input, imperative methods and named models. Optional exports are measured separately with React, Jotai, Query and RHF external. Compression deltas are not additive and depend on the surrounding application.

Assertions reject retired runtime modules and prevent model registry, Query, RHF and persistence code entering ordinary holo fixtures. There is one binding runtime; no compatibility implementation is included.

The script and dependency lockfile are the measurement sources. See the [API audit](api-audit.md#bundle-check) for current fixture deltas and [model composition validation](model-composition-validation.md) for the earlier recorded revision.

# holoMolecule

Select native atoms from a scoped Bunshi model without declaring holo during render. Import **only** from `jotai-holo/bunshi`.

<Demo kind="bunshi">

<<< @/../examples/docs/bunshi.tsx#bunshi

</Demo>

<<< @/../examples/bunshi.tsx

## Contract

`const select = holoMolecule(Molecule)`; `select(model => model.$atom)` creates a binding descriptor. It is not an atom and cannot be passed to store.get/set or ion. Place it in holo.state or holo.actions. Direct native atoms can be mixed with descriptors.

One adapter shares model resolution between its bindings within a holo instance. Bunshi owns injector, scope and model lifetime; Jotai owns values in a store. Changing a scope-selected model switches subscriptions and callbacks while retaining the View identity. Model replacement alone does not restart cage.

Holo does not inject a ScopeProvider or own an injector. Context contains only ordinary cage props, **not the resolved molecule**. The current adapter does not directly solve cage-to-scoped-model input forwarding. No molecule/scope fields exist in the core holo API.

Keep optional Bunshi imports out of ordinary bindings. Create injectors/stores per SSR request. See the engineering memory report for measured cleanup cases; it is not a universal absence-of-leaks guarantee.

## Why this API

Bunshi already solves scoped dependency injection. This adapter only lets ordinary holo resolve atom targets through Bunshi hooks internally. The core API stays the same, no useMemo-created component is required, and applications without Bunshi avoid its runtime.

## Analogies and reading

- [Bunshi repository](https://github.com/saasquatch/bunshi) — the actual molecule, scope and lifetime implementation.
- [React rules of hooks](https://react.dev/reference/rules/rules-of-hooks) — why hook-based resolution belongs in the mounted adapter, not at module evaluation.

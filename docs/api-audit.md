# Public API and documentation audit

This audit applies to the `feat/model-composition` checkout. Package exports,
strict type fixtures and executable examples are the sources of truth.

## One model interface

```text
pure factory
  → pipe
    → modelRegistry
    → modelConnection / modelLifecycle
    → modelAnalytics (optional entry)

holo(view, models, read, write, props, input, imperative)
```

- Model construction uses pure factories and composition modifiers. The registry
  engine is private; package consumers use the composition entry.
- `bond.write` is the only recipient field. Retired `yield` and `action` fields
  throw rather than being silently ignored. Types reject them.
- `holo` accepts view/models/read/write/props/input/imperative/onError. Retired
  aliases and raw lifecycle/resources fields are rejected, including in holoForm.
- `modelConnection` reuses shared activation, reverse cleanup and setup rollback
  for external integrations. It adds no registry and does not extend model records.
- Registry retention remains retainTime. Retired gcTime/connect/resources options
  are rejected at the public modifier, not interpreted as compatibility aliases.

Atom helpers, independent prism selectors, Query/Mutation adapters, RHF and
persistence retain their contracts. A native write-only atom with a constant null
read remains a valid write target but cannot expose individual trigger calls;
actionAtom and eventAtom expose those calls explicitly.

## Type findings

A reusable modifier with a concrete base-model parameter can narrow an extended
record. The pipe overload for model-preserving built-ins now retains the exact
input model and initial types, even when an analytic factory consumes a smaller
contract. Its type-only evidence is erased from emitted JavaScript. Arbitrary
pipe transformations still infer their actual outputs.

The strict fixtures cover long mixed modifier chains, record extensions, initial
extensions, invalid initial values, writable arguments, action arguments,
incompatible modifiers and rejected legacy fields. Custom generic modifiers use
ModelSource<Model, Initial>; no internal-symbol casts are needed.

Outside pipe, a manually annotated wrapper can still deliberately narrow a type.
Use the generic modifier pattern in the guide to preserve caller extensions.
Neither type inference nor store.get acquires dependency ownership automatically.
Selection options allow omitted initial data so an existing key can be selected
without resetting it. For a factory requiring creation input, supply registry
defaults or initial on its first selection; the type system cannot know whether
a particular key already exists.

## Documentation and examples

The new [composition guide](/guide/model-composition) explains pure factories,
record extension, registry identity, modifier order, custom connections and
ownership outside React. Its shipment tracking modifier is executable and tested
with a fake transport, shared owners and separate stores.

Removed the duplicate registry-constructor reference, obsolete runtime validation page,
stale development-branch checkout instruction and artificial message demo.
Public examples use one model syntax and bond.write. Event documentation follows
API-confirmed profile saving; the order example shows an independent receipt
reaction. The list example uses a direct command instead of a redundant event
forwarder. Examples use checked sources and 80-column code formatting.

English, Russian, German and Kazakh share executable code. Translations live in
Lingui catalogs; generated routes and retired-page cleanup are checked. Historical
bundle measurements are marked with their recorded revision rather than presented
as measurements of this checkout.

## Validation

- Strict TypeScript and packed package exports/declarations.
- 190 unit tests, 17 ecosystem checks and 144 Chromium tests (351 total).
- Packed React 18.0, 18.3 and 19.3 development/production consumers.
- Four-language catalog, snippet, link and production documentation checks.
- Registry/composition and production-browser forced-GC scenarios.

Run the package scripts for current results. These checks cover documented
scenarios; they do not prove arbitrary application transports free their own
resources or provide durable analytic delivery.

## Bundle check

Equivalent production counter fixtures add 2,284 gzip bytes for ordinary holo,
unchanged from the preceding revision, and 4,216 bytes with pipe/modelRegistry.
The new type-preservation evidence is erased; optional modelConnection code does
not enter ordinary bindings. These are non-additive fixture deltas, not standalone
export sizes. Run pnpm size to reproduce them.

## Example verification

All 34 inline TypeScript/TSX fences in README and canonical documentation are
compiled with strict settings against the source API. Short fragments receive
explicitly typed application dependencies from tests/fixtures/docs-context.tsx;
helpers, model factories and adapters use actual implementations. This checks
API compatibility of partial snippets, not whether each fragment is standalone.
Three deliberately invalid examples verify the checker rejects wrong read types,
missing public input and retired syntax. Imported snippet sources are also
included in the ordinary project typecheck and browser suites.

Input examples distinguish synchronized props from creation-only model input:
input props and model-selector props remain public and reach the View. An
unchanged initial does not reset edits; changing it writes the target again.
The corrected RHF example selects $$contact and accesses its native model.form.
Documentation checks validate internal heading fragments as well as page paths.

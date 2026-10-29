# Documentation graphs

This module belongs to the documentation renderer, not the published library.
Miniatures display authored dependencies. A full map uses the same scene and can
mount an existing demo; it does not automatically inspect an arbitrary app.

## Automatic miniatures

VitePress generates miniatures for code examples in guides, topics, recipes,
references and examples. `document-graphs.mjs` groups snippets and inline code
within a section or Demo, keeping imports and related declarations together.
It preserves authored GraphExample wrappers and CodeNotes containers.

`source-scene.mjs` reads those displayed sources with the TypeScript parser at
build time. It records explicit atom reads/writes, holo bindings, JSX composition
and model boundaries. It does not run examples. Opaque model handles remain
opaque; a static edge does not claim that a subscription is active. Connections
that require runtime knowledge still need an authored scene and instrumentation.
Generated maps show the extractable structure of the excerpt. Computed property
access and undeclared adapter internals can leave connections absent.

Generated JSON lives in ignored `.generated/`. Each miniature loads its own
scene on demand; the parser is never sent to the browser. `coverage.json` lists
the logical examples and extracted participants. Do not edit generated files.
Change the executable source, extractor or authored override instead.
Restart `docs:dev` after changing examples or adding code sections so the scene
manifest is rebuilt. `docs:build` and `docs:check` always regenerate it.

Inline examples use an article-and-block source identity. Imported snippets use
their real file path. Duplicate source lines carry an occurrence index so
selection cannot jump to a different declaration with the same text.

## Add an authored scene

1. Add its executable source imports and metadata to `scenes.ts`.
2. Give every node and group a stable ID. Reuse IDs between both modes.
3. Point source refs to a source ID and a unique line anchor, rather than a line
   number. List a declaration first, then any binding line usable in excerpts.
4. Describe edges according to the actual source: props, read, write, fact or
   delivery. Group boundaries describe records/resources; mark real registries.
5. Set `article` to the canonical article plus an explicit existing heading ID.
6. Wrap the related snippet imports in canonical Markdown:

```md
<GraphExample scene="shared-atoms">

<<< @/../examples/atoms-or-models.tsx#atom-imports
<<< @/../examples/atoms-or-models.tsx#global-atoms

</GraphExample>
```

One wrapper owns the right rail for a complete example. Do not add one wrapper
per declaration. CodeNotes inside it remain in the source flow. The wrapper uses
the existing VitePress snippets/copy buttons; translations preserve its tags and
its scene ID. The source renderer supplies `data-code-source` per code card so
identical names in different files cannot select the wrong node.

Both modes use `GraphCanvas.vue` to lazily mount the same React renderer.
`Graph.tsx` owns selection and drag behavior; `force-layout.ts` owns compact
layout physics. Full-map positions are authored independently of compact layout.
Physics sleep after settling and pause offscreen/in hidden tabs; reduced motion
computes the compact layout without animated movement.

## Runtime activity

A scene's `demo` opts into an existing `Demo`. GraphMap provides an optional
activity callback through the Vue tree. `mount-demo.tsx` only installs the
analytics instrumentation when this callback exists. No miniature starts a demo,
acquires a model or subscribes to business state.

`observe-analytics.ts` listens to preview-only factory readiness and actual
adapter delivery logs. It never adds a model owner. Model factories and View
implementations do not import graph modules. A runtime flag must stop updating
after its owner releases, including when an import completes late.

Boundaries appearing mean the analytics factory loaded; delivery highlights mean
an adapter received a mapped message. Neither is a durable event log or proof
of backend ingestion. Multiple deliveries accumulate in a short highlight window.
Other demos need their own explicit instrumentation before claiming activity.

## Verification

`pnpm docs:check` checks source refs, IDs, links, force semantics and graph
TypeScript alongside the existing documentation checks. Run `pnpm docs:build`
and `node scripts/test-doc-graphs.mjs` for rendered changes. The browser suite
covers the authored scenes and generated examples in four locales, source
highlighting, selection, expansion, mobile layout, live analytics and
locale-query continuity. `check-generated-graphs.mjs` inventories code sections
and validates their generated source references and edges;
`test-source-scene.mjs` checks extraction semantics.

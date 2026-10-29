# Documentation graphs

This module belongs to the documentation renderer, not the published library.
Miniatures display authored dependencies. A full map uses the same scene and can
mount an existing demo; it does not automatically inspect an arbitrary app.

## Add a scene

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
covers the three pilot scenes in four locales, source highlighting, selection,
expansion, mobile layout, live analytics and locale-query continuity.

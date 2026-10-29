# Constellation graph: map and miniature

An isolated design iteration for a documentation graph. The selected direction
is Constellation; earlier Flow/Trace variants and the comparison picker are removed.
The actual documentation renderer is not modified yet.

```sh
pnpm exec vite --config prototypes/system-graph/vite.config.ts --host 127.0.0.1 --port 5181
pnpm exec tsc -p prototypes/system-graph/tsconfig.json --noEmit
pnpm exec vite build --config prototypes/system-graph/vite.config.ts
node prototypes/system-graph/check.mjs
```

- `/?mode=map`: full interactive gift checkout graph, source inspector and live UI.
- `/?mode=mini`: article-layout mockup with real source and a compact force graph.
- `/?mode=map&example=atoms`: expands that same seven-node graph with source.

## Shared miniature contract

`MiniData` holds stable node IDs, semantic kinds, names, code anchors and edges.
`Miniature` renders the same data compactly or expanded; expanding changes the
presentation, not the meaning or graph membership. The compact version shows
only circular nodes and undirected links; selection previews a name and source.
React nodes are blue, holo green, Jotai white. The article imports executable
source directly; it does not maintain a separate code illustration.

`force-layout.ts` applies pairwise repulsion, spring attraction, weak centering,
velocity damping and bounds. Drag pins a node until release. The simulation
sleeps after settling, stops outside the viewport or in a hidden tab, and cleans
up on unmount. Reduced motion computes a settled layout synchronously rather
than animating it. Pointer capture, keyboard selection and 44px hit targets are
supported. The solver is deliberately small; it is not intended for thousands
of nodes or automatic dependency extraction.

## Full business map

The gift example runs Jotai, holo, modelRegistry, modelConnection, Query/Mutation
models, an RHF model and modelAnalytics. Each restart gets a separate store,
QueryClient and adapter log. Data and purchase transports are local simulations;
no purchase API or analytics vendor SDK is called. The analytics model uses a
real dynamic import with an explicit 600 ms demo delay. Its branch only appears
when connected; facts from before loading are not replayed.

`spec.ts` authors this example's graph and code anchors. Highlighted edges are
semantic paths, not execution profiling. The compact article graph shows
undirected dependencies; the detailed business map distinguishes data, commands
and facts. Registry retention and different instance keys are not demonstrated.

Before integration: connect the miniature to the real documentation layout,
settle per-example graph metadata and locale/theme support. The only production
example change here replaces a static-only holo Toolbar wrapper with ordinary
React composition, with corresponding translated explanation.

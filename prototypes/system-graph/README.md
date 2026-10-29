# System graph prototypes

Three isolated directions for a reusable documentation graph. No production
routes or library API are changed. Choose a direction before integration.

| Variant   | Primary question                                | Layout                                    |
| --------- | ----------------------------------------------- | ----------------------------------------- |
| Поток     | How does Parent → holo → View connect to atoms? | Directed layers, source inspector         |
| Созвездие | Which atoms and consumers belong together?      | Spatial clusters, model navigation        |
| Трасса    | What happens after an interaction?              | Step navigator, active path, source below |

```sh
pnpm exec vite --config prototypes/system-graph/vite.config.ts --host 127.0.0.1 --port 5181
pnpm exec tsc -p prototypes/system-graph/tsconfig.json --noEmit
pnpm exec vite build --config prototypes/system-graph/vite.config.ts
node prototypes/system-graph/check.mjs
```

Open `http://127.0.0.1:5181/?v=1`. Keys 1–3 switch variants; R resets the
scenario. Hover/focus previews a source location; click/Enter pins it; Escape
unpins. On touch, tap a node. Narrow screens scroll the graph locally.

## What is real

The example runs Jotai, holo, modelRegistry, modelConnection, Query/Mutation
models, an RHF model and modelAnalytics. Each replay creates a separate store,
QueryClient and analytics provider. Multiple small holo bindings select the same
registry key. Transports are local simulations; the analytics adapters only
append to this instance's log. No purchase, network request or vendor SDK is used.
The analytics model is a real dynamic import, with an explicit 600 ms demo delay.
Observation starts after its factory loads: earlier purchase facts are not replayed.

`createScenario` is the prototype harness, not a recommended application factory.
It isolates replayed scenarios and injects their simulated adapters.

## What is authored

`spec.ts` describes the example's graph, semantic edges, three layouts and source
anchors. Source panes read the actual executable files via Vite raw imports.
This is not runtime dependency extraction or an automatic devtools. Subscriptions
in the preview controller are instrumentation for visible activity; they do not
wire business rules. A highlighted edge is a semantic path, not an execution
profiler. Registry retention and multiple different keys are not demonstrated.

Filled circles: React blue, holo green, Jotai white. Hollow circles: RHF control
and adapters. Purple boundaries group models. Double boundaries indicate
registry-backed instances (business and form); Query/Mutation rely on QueryClient.
Solid arrows carry data/props; dashed arrows are commands/facts; dotted arrows
show control provisioning. Reverse arrows are offset rather than overprinted.

Before promotion: settle the graph format, compact embedding, code anchors,
locale integration and theme support. These prototypes deliberately do not alter
the documentation renderer or add a production dependency.

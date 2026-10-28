# Atoms or models?

Start with atoms. Use a model when related state and actions need a common factory. Add a registry when components need to select and share instances by key. These are separate choices; holo does not require all three.

## Choose by the task

| I need to…                                            | Use                            | Why                                                       |
| ----------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| Share a theme or language preference                  | Module-level atoms             | Components in the same store read the same values         |
| Publish a help request from a toolbar                 | `eventAtom` in `write`         | An event does not require a model                         |
| Calculate a cart total                                | A derived atom or `ion`        | A calculation does not need an instance registry          |
| Keep search text and stock filters together           | A plain model factory          | Group related atoms and create them together              |
| Give two fixed editors independent drafts             | Call the factory twice         | Different atom records keep the drafts independent        |
| Share a product editor with its toolbar by product ID | `modelRegistry` + `models`     | Both components select the same instance by key and store |
| Subscribe to a shipment feed while its model is used  | `modelConnection`              | Model owners activate and release the subscription        |
| Load and save a draft                                 | `modelLifecycle`               | Add loading and snapshot persistence to the factory       |
| Share an RHF form with an external toolbar            | `createFormModel` + `holoForm` | The controls use one native RHF form instance             |

## Global state and events: just atoms

The workspace toolbar reads the theme, changes it and publishes help requests. There is no model to register.

<<< @/../examples/atoms-or-models.tsx#atom-imports
<<< @/../examples/atoms-or-models.tsx#global-atoms

The View receives ordinary values and callbacks. It does not need to know where they came from.

<<< @/../examples/atoms-or-models.tsx#toolbar-view

`$theme` is a native writable atom, so it works in both `read` and `write`. `helpRequested` is a write-only event, so it belongs in `write`. Publishing it does not open a help window by itself: the application chooses a consumer separately.

Global atoms share values within one Jotai store. Separate stores isolate them; a module-level atom definition does not merge their state.

## Related state: a plain factory

Catalog filters and order filters both have a search term and a stock switch. They use the same factory but need independent values.

<<< @/../examples/atoms-or-models.tsx#factory

Each call creates new atoms. The application creates these instances once, outside React render. A plain model is just a record of related atoms; it does not need a registry.

<<< @/../examples/atoms-or-models.tsx#direct-model

This connection still has no `models` field. It reads and writes atoms from the explicitly created record. Connect `$$orderFilters` the same way for an independent instance.

## Shared instances by ID: add a registry

A catalog page and its toolbar need the same filters for the selected catalog. Components choose the instance by `catalogId` instead of passing an atom record between them.

<<< @/../examples/atoms-or-models.tsx#model-imports
<<< @/../examples/atoms-or-models.tsx#keyed-model

<<< @/../examples/atoms-or-models.tsx#usage

The same definition, key and store select the same instance. Another catalog ID selects independent filters. The registry adds identity and retention; `models` lets holo select the instance and own its active connections.

The View stays the same in both approaches:

<<< @/../examples/atoms-or-models.tsx#filters-view

## Connections and loading: add only the responsibility you need

A group of atoms does not need lifecycle hooks just to hold state. Add [modelConnection](/reference/modelConnection) when it owns an external subscription, or [modelLifecycle](/reference/modelLifecycle) when it must load and save data. Add [modelAnalytics](/reference/modelAnalytics) when analytics should follow the model's usage.

Use the decorated definition in `holo.models` so holo activates and releases this work. Binding one of its atoms directly does not acquire the model.

These modifiers manage work while an instance is owned. `modelRegistry` chooses how instances are shared and retained. Read [Model composition](/guide/model-composition) for combining these responsibilities.

For server cache use [queryAtoms](/reference/queryAtoms); for RHF use [holoForm](/reference/holoForm). You do not need to wrap unrelated global atoms in a model to bind them to a View.

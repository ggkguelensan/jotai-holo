# Atoms or models?

A search filter can begin with two atoms: the search term and an “in stock”
switch. Grouping them in a model does not change their reactivity. It gives the
related atoms a name and, if needed, a factory that can create another set.

Choose how much structure the task needs: an atom, a record of atoms, or shared
instances selected by key. holo works with each arrangement.

## First ask who needs to react {#choose-by-the-task}

A value does not need an atom just because several React components use it.
A theme or language may already belong to a React provider. Add it to Jotai
when atom calculations, commands or connections need to react to it.

Once that need exists, the scope is a separate decision:

| Situation                                            | Start with             |
| ---------------------------------------------------- | ---------------------- |
| One shared value or event                            | Module-level atoms     |
| Several related values and commands                  | A record of atoms      |
| Two independent sets of the same state               | A factory called twice |
| Separate components must find one set by an ID       | A registry             |
| A model must listen to an external source while used | A managed connection   |

The next sections show where each additional responsibility becomes useful.

## Shared values and events: just atoms {#global-state-and-events-just-atoms}

A workspace toolbar reads the theme and publishes a help request. If model
workflows need these inputs, the application can expose them as atoms:

<<< @/../examples/atoms-or-models.tsx#atom-imports
<<< @/../examples/atoms-or-models.tsx#global-atoms

The writable `$theme` supplies a value through `read` and a setter through
`write`. The `helpRequested` event supplies a callback through `write`.
No model registration is needed.

Publishing the help request does not open a window on its own. The application
chooses a consumer separately. An event announces something; the connection to
a reaction is another decision.

“Global” here means shared by consumers in one Jotai store. A separate store has
independent values and event delivery, even though it uses the same atom
declarations.

## Related state: create a record {#related-state-a-plain-factory}

Catalog filters and order filters have the same fields but must keep different
values. A factory creates those fields together:

<<< @/../examples/atoms-or-models.tsx#factory

Calling `createFiltersModel()` twice creates two different atom records.
`$$catalogFilters` is one model instance; `$$orderFilters` is another. Create
these fixed instances outside React render.

The View can bind directly to the first record:

<<< @/../examples/atoms-or-models.tsx#direct-model

There is no `models` section here. Grouping atoms in a record does not require
holo to manage that record's lifetime. Connect the second record in the same
way for an independent filter.

As rules grow, the record can also contain derived atoms and commands. A command
can enforce an allowed change once, rather than requiring every View to enforce
it. [Business logic and small Views](/guide/business-logic) develops that step.

## Shared instances by ID: add a registry

Suppose the filter panel and toolbar are in different parts of the page. Both
know the catalog ID and need to find its current filters. A registry gives them
a shared way to select the instance:

<<< @/../examples/atoms-or-models.tsx#model-imports
<<< @/../examples/atoms-or-models.tsx#keyed-model

<<< @/../examples/atoms-or-models.tsx#usage

These two rendered components use different catalog IDs, so they edit different
filters. Rendering another component with `catalogId="hardware"` in the same
store selects the existing hardware instance.

There are now three different things:

- `createFiltersModel`: a factory that creates a record.
- `$$filters`: a definition that selects records in a store.
- The selected record: the atoms used by a particular catalog.

`holo.models` selects that record and owns its active connections. The registry
can retain the record after the last component leaves. Other managed modifiers
also return definitions; an explicit registry adds its own sharing namespace and
retention policy. [Models and registries](/topics/models-and-registries) explains
how those definitions compose.

Use a registry when this selection or retention solves a task. A fixed instance
that the application already passes explicitly does not need one. See
[why use a registry?](/topics/models-and-registries#why-use-a-registry).

The example uses `pipe` from `jotai-holo/model`. A compatible pipe from another
functional library works too; [choose a pipe](/topics/model-composition#choose-a-pipe)
explains the convention and links to the Effect pipeline guide.

## What belongs to an instance?

A registry does not copy all dependencies of a model. Consider an order that
uses a shared unit price:

<<< @/../examples/registry-dependencies.ts#shared-dependency

Each call to `createOrderModel` creates its own `$quantity` and `$total` atoms.
`$unitPrice` was created outside the factory, so every order in the same store
uses it.

For two order keys:

- Changing one quantity changes that order's total.
- Changing the shared price changes both totals.
- Selecting another store isolates all values, including the shared price.

Using atoms from an existing global model inside a factory also keeps those
atoms shared. Calling that model's factory would instead create new atoms.
The placement of atom creation determines which records share them.

## Add active work when it has a lifetime {#connections-and-loading-add-only-the-responsibility-you-need}

A record can hold state without running background work. Add a managed
connection when the model must listen to a feed, connect another model or
observe an external source while someone uses it.

`modelConnection` adds that work to a factory. Use the resulting definition in
`holo.models` to activate and release it. Binding one of its atoms directly does
not acquire the model's managed work.

The last owner releases connections. A retained draft can therefore have no
active subscriptions. Read [model composition](/topics/model-composition) to
attach connections, loading or analytics without adding those dependencies to
the business factory.

## Separate a fact from its reaction {#connections}

A successful save can publish a `profileSaved` event. A notification model may
react to it, but the profile model does not need to import the notification code.
`bond` describes the connection between that event and a reaction.

The declaration itself does not subscribe. An application or model owner must
activate it and release it afterwards. Use the [bond reference](/reference/bond)
for trigger, state and ownership semantics. The
[order confirmation example](/examples/order-confirmation) shows a completed
order reaching a separate UI consumer.

## Let consumers choose independent values {#independent-projections}

If a name field reads the entire profile object, changing the avatar also changes
its input object. Use a derived atom for the name, or `prism` to declare several
independent projections. Reading one projection does not execute unused
selectors.

A selector that returns a new object also returns a new identity. Use native
`selectAtom` when you need custom equality; use focused writable state when the
application needs to edit a part of a larger value.

[Try independent profile fields](/examples/profile-fields), then see
[workshop calculations](/examples/workshop-tickets) for combining atom values.

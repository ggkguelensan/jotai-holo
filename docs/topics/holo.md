# holo

holo connects atom values and commands to ordinary React props. A View receives
a value such as `name` and a callback such as `onChange`; the binding chooses
where they come from.

This article explains the directions of that connection. For choosing between
plain atoms and model instances, read [atoms and models](/topics/atoms-and-models).

## Connect atoms directly {#atoms-without-models}

The [getting started example](/guide/getting-started) uses one writable atom:

<<< @/../examples/quickstart.tsx#quickstart-state
<<< @/../examples/quickstart.tsx#quickstart-binding

`read` supplies the current value as `name`. `write` supplies a callback as
`onChange`: calling it with a string writes that string to `$name`. The same
writable atom can serve both directions.

`NameView` receives ordinary props. It does not need to know the source atom or
store. Native Jotai atoms work too; no model declaration is required.

A toolbar composes two connected controls. ThemeControl reads and writes the theme; Help only publishes a request:

<<< @/../examples/atoms-or-models.tsx#global-atoms

Toolbar supplies its fixed title through `static` and composes the controls. It does not read their atoms. The remaining unbound View props, if any, come from the parent. Supplied `read`, `write`, `static` and `imperative`
props are not public inputs to the connected component.

## Map a selected model's fields to props {#named-models}

When a binding uses models, `models` selects their instances first. The mapping
callbacks then receive the selected records and return atom references. This
excerpt uses the filter factory introduced in [atoms and models](/topics/atoms-and-models#related-state-a-plain-factory):

<<< @/../examples/atoms-or-models.tsx#keyed-model

GameTerm and GameSale each select the filters record using `catalogId`. Their bindings map one field to a value and callback. GameFilters composes these controls and passes only the ID; it does not read the filter values. Each field View receives ordinary props.

These callbacks choose references. They do not subscribe to atom values or
re-run a calculation whenever a value changes. Put calculations in a derived
atom, then bind its result through `read`.

holo acquires managed models after commit and releases them on cleanup. Selecting
an instance and keeping its connections active are explained in
[models and registries](/topics/models-and-registries). That article also covers
shared keys, default instances and retention.

## Forward a parent prop into atom logic {#input-synchronization}

Selecting an instance and passing a changing value into it are different tasks.
For example, the parent can supply a search term that the atom graph needs:

<<< @/../examples/documentation.tsx#input

Rendering `<Search term="starfall" />` first commits the caller's props. `input`
then passes `term` to `inputChanged`, which writes `$query`. The View receives
the ordinary `term` prop as well as the atom value `query`.

A subsequent committed change is forwarded when the selected input differs by
`Object.is`. An abandoned React render does not publish it. This avoids an
input-forwarding effect in the View.

Because the write happens after commit, `input` cannot supply data required to
complete that same first render. Use model creation data for values that must
exist before the first commit. See [the input contract](/reference/input).

## Keep UI-specific methods in the View {#imperative-view-methods}

A toolbar button can request focus in game search. It publishes a request; only
the search View knows the input element and calls its DOM method.

<<< @/../examples/docs/imperative-focus.tsx#focus

Bind the toolbar button's callback to `searchFocusRequested` through `write`.
After Search commits, each request calls `focusSearch`. Repeating the request
focuses the input again without creating a boolean state or a reset action.

Use this bridge for focus, animation, router and hook methods. Ordinary receipt
data belongs in `read`; it does not need an imperative handler just to copy the
payload into React state. See [the runnable examples](/reference/useImperativeHolo)
for animation and a Reactuse `useShare` integration.

The bridge calls the latest committed handler. Updating a React dependency must
not leave an earlier navigation function captured inside a long-lived event
subscription. See [useImperativeHolo](/reference/useImperativeHolo) for the handle
and delivery contract.

## Choose the subscription boundary {#rendering-and-async}

Connect the smallest View that needs a reactive value. A page can arrange a
filter panel and toolbar without reading their state itself. If a displayed
atom value changes, holo updates that View. Stable values and shallow-equal
caller props can skip a View render; local React state and context still update
normally.

`read` chooses the displayed atom values. Model selection and managed model
connections may also read atoms or subscribe as part of their own work. Keeping
a value out of `read` does not disable the model's connections.

Async atom values resolve before they reach the View. Use Suspense and error
boundaries for pending or failed reads. Changing the selected model instance
remounts its View. Read [rendering and async](/guide/rendering) before relying on
local View state across instance changes or Suspense transitions.

## Lists and branches

When the task is to render a collection or choose a screen, use
[holoList](/reference/holoList) or [holoMatch](/reference/holoMatch). A list needs
stable row keys. A local conditional can remain an ordinary React conditional.

[Try rows and screen states](/examples/lists-and-branches) for a runnable example.

## API reference

- [holo](/reference/holo): bindings, fixed props and model selection.
- [input](/reference/input): delivery of committed parent props.
- [useImperativeHolo](/reference/useImperativeHolo): event handlers inside View.

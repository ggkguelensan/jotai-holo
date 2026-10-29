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

A binding can combine unrelated atoms. For example, the workspace toolbar reads
the theme and publishes a help request:

<<< @/../examples/atoms-or-models.tsx#global-atoms

Here `static` supplies the fixed title. The remaining unbound View props, if
any, come from the parent. Supplied `read`, `write`, `static` and `imperative`
props are not public inputs to the connected component.

## Map a selected model's fields to props {#named-models}

When a binding uses models, `models` selects their instances first. The mapping
callbacks then receive the selected records and return atom references. This
excerpt uses the filter factory introduced in [atoms and models](/topics/atoms-and-models#related-state-a-plain-factory):

<<< @/../examples/atoms-or-models.tsx#keyed-model

In this example, the incoming `catalogId` selects the filters record. The `read`
callback maps its `$term` to the View's `term` prop; `write` maps the same atom
to `onTermChange`. The View does not receive a model record or atom objects.

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

Rendering `<Search term="jotai" />` first commits the caller's props. `input`
then passes `term` to `inputChanged`, which writes `$query`. The View receives
the ordinary `term` prop as well as the atom value `query`.

A subsequent committed change is forwarded when the selected input differs by
`Object.is`. An abandoned React render does not publish it. This avoids an
input-forwarding effect in the View.

Because the write happens after commit, `input` cannot supply data required to
complete that same first render. Use model creation data for values that must
exist before the first commit. See [the input contract](/reference/input).

## Keep UI-specific methods in the View {#imperative-view-methods}

An order-created fact may need to navigate to a receipt. The business model
should publish the order ID; it does not need to hold a router function.

The two sides of the bridge are an event mapping in holo and a handler inside
the View. This minimal receipt screen uses the same `HoloImperative` handle and
`useImperativeHolo` pattern as the
[order confirmation example](/examples/order-confirmation):

```tsx
import { useState } from 'react';
import {
  eventAtom,
  holo,
  useImperativeHolo,
  type HoloImperative,
} from 'jotai-holo';

type Receipt = { orderId: string; total: number };
type ReceiptHandle = { onOrderCreated(receipt: Receipt): void };

const orderCreated = eventAtom<Receipt>();

function ReceiptView({
  imperative,
}: {
  imperative: HoloImperative<ReceiptHandle>;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useImperativeHolo(imperative, {
    onOrderCreated: setReceipt,
  });

  return <output>{receipt?.orderId ?? 'No order yet'}</output>;
}

const ReceiptScreen = holo({
  view: ReceiptView,
  imperative: { onOrderCreated: orderCreated },
});
```

After `ReceiptScreen` commits, publishing `orderCreated` in its store calls
`onOrderCreated` with the receipt. That handler updates local React state. A real
View can instead use its router or editor hook there; the publishing model does
not need those React functions.

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

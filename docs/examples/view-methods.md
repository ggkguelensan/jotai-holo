# View methods

A View displays purchase state through read bindings. When the purchase succeeds,
useImperativeHolo connects the domain fact to a short success animation.

## Focus a search field

<Demo kind="imperative-focus">

<<< @/../examples/docs/imperative-focus.tsx#focus

</Demo>

## Restart a cart animation

<Demo kind="imperative-animation">

<<< @/../examples/docs/imperative-animation.tsx#animation

</Demo>

## React to a successful purchase {#call-a-method-returned-by-a-react-hook}

The right panel is visible from the start: ready, pending, error or complete.
Its data comes through `read`. The command publishes `orderCreated` only after
the mutation succeeds; `imperative` uses that fact to highlight the result.

<Demo kind="imperative-purchase" :files="['imperative-purchase-views.tsx']">

<<< @/../examples/docs/imperative-purchase.tsx#purchase
<<< @/../examples/docs/imperative-purchase-views.tsx#receipt-handle

</Demo>

Purchase state determines the panel content. The success event starts only the
animation; it does not control visibility or copy data into React state.

## Keep a local button local

<Demo kind="imperative-share">

<<< @/../examples/docs/imperative-share.tsx#share

</Demo>

Read [useImperativeHolo](/reference/useImperativeHolo) for delivery, reduced motion
and browser activation requirements.

# View methods

A View can call its own DOM and hook methods from a local button. Use
useImperativeHolo when an external business process also needs that behavior: a
successful purchase opens the receipt, while its button can reopen it directly.

## Focus a search field

<Demo kind="imperative-focus">

<<< @/../examples/docs/imperative-focus.tsx#focus

</Demo>

## Restart a cart animation

<Demo kind="imperative-animation">

<<< @/../examples/docs/imperative-animation.tsx#animation

</Demo>

## React to a successful purchase {#call-a-method-returned-by-a-react-hook}

The purchase command awaits the mutation, stores its result and publishes
`orderCreated` only after success. Receipt data comes through `read`; the fact
opens the dialog through `imperative`. A failed purchase does not open it.

<Demo kind="imperative-purchase" :files="['imperative-purchase-views.tsx']">

<<< @/../examples/docs/imperative-purchase.tsx#purchase
<<< @/../examples/docs/imperative-purchase-views.tsx#receipt-handle

</Demo>

Close the receipt and reopen it with View receipt. That button calls the View's
own method directly; it does not publish an event just to call itself.

## Keep a local button local

<Demo kind="imperative-share">

<<< @/../examples/docs/imperative-share.tsx#share

</Demo>

Read [useImperativeHolo](/reference/useImperativeHolo) for delivery, reduced motion
and browser activation requirements.

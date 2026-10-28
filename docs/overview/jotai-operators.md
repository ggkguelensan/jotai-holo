# Jotai operators

## stateAtom

Store an editable value or derive a value from other atoms. A draft name is state; its character count is derived state.

Choose stateAtom to express state intent, including derived read/write state. Native atom remains equally supported.

## ion

Calculate one value from several atoms. In the cart below, quantity and discount determine the total.

<Demo kind="ion">

<<< @/../examples/docs/ion.tsx#ion

</Demo>

Use ion when you can list the inputs at declaration time. The result has Jotai's normal caching and equality rules. A projector that returns a new object changes the result's identity.

## prism

Select several fields from one atom. Each field becomes an independent read-only atom, so a role change can leave the name View unchanged.

<Demo kind="prism">

<<< @/../examples/docs/prism.tsx#prism

</Demo>

Use prism when several Views need different fields from the same source. Each output computes separately. Use selectAtom for custom equality, or optics for writable projections.

## Conditions and calculations

<Demo kind="operators">

<<< @/../examples/docs/operators.tsx#operators

</Demo>

### eq

Compare an atom with a value or another atom. Use `eq($deliveryMethod, 'courier')` to check whether an order uses courier delivery.

### and

Require every condition to pass. For example, enable ordering only when a delivery method is available and the terms are accepted.

### or

Check whether any boolean atom is true. Use it when either of several delivery methods is enough to proceed.

### some

Find whether any input matches a condition. Check several price atoms, or check the items of one array atom.

### sum

Add numeric atom values. For example, calculate an order total from goods and delivery charges.

Use a named helper for a condition you want to recognize at a glance. Use `ion` for an arbitrary calculation over fixed inputs, or `atom(get => …)` for conditional dependencies.

## Commands and facts

Describe an operation that reads or updates atoms. For example, validate a draft and submit it to an API.

Announce that something happened. Emit `profileSaved` after the API confirms a save, then let notifications or analytics react to that fact.

<<< @/../examples/documentation.tsx#workflow

## API reference

- [stateAtom](/reference/stateAtom)
- [ion](/reference/ion)
- [prism](/reference/prism)
- [eq](/reference/eq)
- [and](/reference/and)
- [or](/reference/or)
- [some](/reference/some)
- [sum](/reference/sum)
- [actionAtom](/reference/actionAtom)
- [eventAtom](/reference/eventAtom)

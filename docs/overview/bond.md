# bond

Connect an event to a reaction. When an order is submitted, read the current settings, check a condition and send arguments to the receiving atom.

<Demo kind="bond">

<<< @/../examples/docs/bond.tsx#bond

</Demo>

<<< @/../examples/documentation.tsx#bond

The API borrows the sampling vocabulary from Effector: state/source, trigger/clock, guard/filter, map/fn, write/target. Explicit connect gives a Jotai store an owner and disposer instead of installing permanent module-level effects. For state-driven reactive synchronization, jotai-effect.observe is usually simpler. For one direct command, calling set inside actionAtom is usually clearer.

## API reference

- [bond](/reference/bond)

import { molecule, createScope, ScopeProvider } from 'bunshi/react';
import { holo } from 'jotai-holo';
import { CounterView } from './basic.js';
import { createCounter } from './counter-model.js';
import { holoMolecule } from './holo-molecule.js';

export const CounterScope = createScope('default');
export const CounterMolecule = molecule((_mol, scope) => {
  const id = scope(CounterScope);
  return { ...createCounter(), id };
});
export const ScopedCounter = holoMolecule(CounterMolecule, (model) =>
  holo({
    core: CounterView,
    state: { count: model.$count, double: model.$double },
    actions: { onIncrement: model.increment, onDecrement: model.decrement },
    props: { title: `Bunshi scope: ${model.id}` },
  }),
);

export function BunshiCounters() {
  return (
    <>
      <ScopeProvider scope={CounterScope} value="shared">
        <ScopedCounter />
        <ScopedCounter />
      </ScopeProvider>
      <ScopeProvider scope={CounterScope} value="independent">
        <ScopedCounter />
      </ScopeProvider>
    </>
  );
}

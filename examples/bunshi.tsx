import { molecule, createScope, ScopeProvider } from 'bunshi/react';
import { holo } from 'jotai-holo';
import { holoMolecule } from 'jotai-holo/bunshi';
import { CounterView } from './basic.js';
import { createCounter } from './counter-model.js';

export const CounterScope = createScope('default');
export const CounterMolecule = molecule((_mol, scope) => {
  const id = scope(CounterScope);
  return { ...createCounter(), id };
});
const counter = holoMolecule(CounterMolecule);
export const ScopedCounter = holo({
  core: CounterView,
  state: {
    count: counter((model) => model.$count),
    double: counter((model) => model.$double),
  },
  actions: {
    onIncrement: counter((model) => model.increment),
    onDecrement: counter((model) => model.decrement),
  },
  bindProps: { title: 'Bunshi counter' },
});

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

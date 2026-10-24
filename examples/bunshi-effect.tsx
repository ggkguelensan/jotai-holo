import { molecule, onMount, useMolecule } from 'bunshi/react';
import { createStore, Provider } from 'jotai';
import { observe } from 'jotai-effect';
import { holo, stateAtom } from 'jotai-holo';
import { CounterScope } from './bunshi.js';
import { createCounter } from './counter-model.js';
import { holoMolecule } from './holo-molecule.js';

// Each scope owns both its atom definitions and an explicit Jotai store.
export const CounterRuntime = molecule((_mol, scope) => {
  const id = scope(CounterScope);
  const store = createStore();
  const model = createCounter();
  const $message = stateAtom('');
  onMount(() =>
    observe((get, set) => {
      set($message, `${id}: observed ${get(model.$count)}`);
    }, store),
  );
  return { ...model, store, $message };
});
const Connected = holoMolecule(CounterRuntime, (model) =>
  holo({
    core: ({ message, onIncrement }: { message: string; onIncrement: () => void }) => (
      <section>
        <h2>Bunshi + observe</h2>
        <p>{message}</p>
        <button onClick={onIncrement}>Increment scoped model</button>
      </section>
    ),
    state: { message: model.$message },
    actions: { onIncrement: model.increment },
  }),
);
export function BunshiEffectCounter() {
  const runtime = useMolecule(CounterRuntime);
  return (
    <Provider store={runtime.store}>
      <Connected />
    </Provider>
  );
}

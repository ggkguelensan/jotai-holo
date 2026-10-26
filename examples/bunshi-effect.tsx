import { molecule, onMount, useMolecule } from 'bunshi/react';
import { createStore, Provider } from 'jotai';
import { observe } from 'jotai-effect';
import { holo, stateAtom } from 'jotai-holo';
import { holoMolecule } from 'jotai-holo/bunshi';
import { CounterScope } from './bunshi.js';
import { createCounter } from './counter-model.js';

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
const runtime = holoMolecule(CounterRuntime);
const Connected = holo({
  core: ({
    message,
    onIncrement,
  }: {
    message: string;
    onIncrement: () => void;
  }) => (
    <section>
      <h2>Bunshi + observe</h2>
      <p>{message}</p>
      <button onClick={onIncrement}>Increment scoped model</button>
    </section>
  ),
  state: { message: runtime((model) => model.$message) },
  actions: { onIncrement: runtime((model) => model.increment) },
});

export function BunshiEffectCounter() {
  // This wrapper owns the Provider, rather than the view's atom bindings.
  const model = useMolecule(CounterRuntime);
  return (
    <Provider store={model.store}>
      <Connected />
    </Provider>
  );
}

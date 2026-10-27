import { observe } from 'jotai-effect';
import { holo, stateAtom } from 'jotai-holo';
import { createModel } from 'jotai-holo/model';
import { createCounter } from './counter-model.js';

export const CounterRuntime = createModel({
  create: () => {
    const counter = createCounter();

    const $message = stateAtom('');
    return { ...counter, $message };
  },
  connect: (model, store) =>
    observe((get, set) => {
      set(model.$message, `Observed count: ${get(model.$count)}`);
    }, store),
});

function ObservedCounterView({
  message,
  onIncrement,
}: {
  message: string;
  onIncrement: () => void;
}) {
  return (
    <section>
      <h2>Shared model + observe</h2>
      <p>{message}</p>
      <button onClick={onIncrement}>Increment shared model</button>
    </section>
  );
}

export const ModelEffectCounter = holo({
  model: CounterRuntime,
  core: ObservedCounterView,
  state: (model) => ({ message: model.$message }),
  actions: (model) => ({ onIncrement: model.increment }),
});

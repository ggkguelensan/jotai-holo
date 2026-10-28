import { observe } from 'jotai-effect';
import { holo, stateAtom } from 'jotai-holo';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import { createCounter } from './counter-model.js';

function createObservedCounter() {
  const counter = createCounter();

  const $message = stateAtom('');

  return { ...counter, $message };
}

export const $$counterRuntime = pipe(
  createObservedCounter,
  modelRegistry(),
  modelConnection((model, { store }) =>
    observe((get, set) => {
      set(model.$message, `Observed count: ${get(model.$count)}`);
    }, store),
  ),
);

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
  models: { model: $$counterRuntime },
  view: ObservedCounterView,
  read: ({ model: model }) => ({ message: model.$message }),
  write: ({ model: model }) => ({ onIncrement: model.increment }),
});

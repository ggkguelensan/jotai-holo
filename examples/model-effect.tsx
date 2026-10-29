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

function ObservationMessageView({ message }: { message: string }) {
  return <p>{message}</p>;
}

const ObservationMessage = holo({
  models: { counter: $$counterRuntime },
  view: ObservationMessageView,
  read: ({ counter }) => ({ message: counter.$message }),
});

function IncrementView({ onIncrement }: { onIncrement: () => void }) {
  return <button onClick={onIncrement}>Increment shared model</button>;
}

const Increment = holo({
  models: { counter: $$counterRuntime },
  view: IncrementView,
  write: ({ counter }) => ({ onIncrement: counter.increment }),
});

export function ModelEffectCounter() {
  return (
    <section>
      <h2>Shared model + observe</h2>
      <ObservationMessage />
      <Increment />
    </section>
  );
}

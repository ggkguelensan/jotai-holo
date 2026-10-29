import { holo, stateAtom } from 'jotai-holo';
import { withAtomEffect } from 'jotai-effect';
import { createCounter } from './counter-model.js';

export function createObservedCounter() {
  const model = createCounter();
  const $message = stateAtom('Waiting for subscription');
  const $observedCount = withAtomEffect(model.$count, (get, set) => {
    const count = get(model.$count);
    set($message, `Observed count: ${count}`);
    // Return a cleanup here when the effect owns an external resource.
  });
  return { ...model, $observedCount, $message };
}

const $$counter = createObservedCounter();
function ObservedCountView({ count }: { count: number }) {
  return <output>{count}</output>;
}

const ObservedCount = holo({
  view: ObservedCountView,
  read: { count: $$counter.$observedCount },
});

function ObservationMessageView({ message }: { message: string }) {
  return <p>{message}</p>;
}

const ObservationMessage = holo({
  view: ObservationMessageView,
  read: { message: $$counter.$message },
});

function IncrementView({ onIncrement }: { onIncrement: () => void }) {
  return <button onClick={onIncrement}>Increment observed state</button>;
}

const Increment = holo({
  view: IncrementView,
  write: { onIncrement: $$counter.increment },
});

export function EffectCounter() {
  return (
    <section>
      <h2>jotai-effect</h2>
      <ObservedCount />
      <ObservationMessage />
      <Increment />
    </section>
  );
}

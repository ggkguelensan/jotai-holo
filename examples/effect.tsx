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
export const EffectCounter = holo({
  core: function EffectView({
    count,
    message,
    onIncrement,
  }: {
    count: number;
    message: string;
    onIncrement: () => void;
  }) {
    return (
      <section>
        <h2>jotai-effect</h2>
        <output>{count}</output>
        <p>{message}</p>
        <button onClick={onIncrement}>Increment observed state</button>
      </section>
    );
  },
  state: { count: $$counter.$observedCount, message: $$counter.$message },
  actions: { onIncrement: $$counter.increment },
});

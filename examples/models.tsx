import { holo } from 'jotai-holo';
import { createModel } from 'jotai-holo/model';
import { CounterView } from './basic.js';
import { createCounter } from './counter-model.js';

export const Counter = createModel({ create: () => createCounter() });

export const KeyedCounter = holo({
  model: (props: { counterId: string }) =>
    Counter({ key: ['counter', props.counterId] }),
  core: CounterView,
  state: (model) => ({ count: model.$count, double: model.$double }),
  actions: (model) => ({
    onIncrement: model.increment,
    onDecrement: model.decrement,
  }),
  bindProps: { title: 'Shared by model key' },
});

export function ModelCounters() {
  return (
    <>
      <KeyedCounter counterId="shared" />
      <KeyedCounter counterId="shared" />
      <KeyedCounter counterId="independent" />
    </>
  );
}

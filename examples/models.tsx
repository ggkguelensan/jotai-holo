import { holo } from 'jotai-holo';
import { createModel } from 'jotai-holo/model';
import { CounterView } from './basic.js';
import { createCounter } from './counter-model.js';

export const Counter = createModel({ create: () => createCounter() });

export const KeyedCounter = holo({
  models: {
    model: (props: { counterId: string }) =>
      Counter({ key: ['counter', props.counterId] }),
  },
  view: CounterView,
  read: ({ model: model }) => ({ count: model.$count, double: model.$double }),
  write: ({ model: model }) => ({
    onIncrement: model.increment,
    onDecrement: model.decrement,
  }),
  props: { title: 'Shared by model key' },
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

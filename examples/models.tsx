import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { CounterControlsView, CounterDisplayView } from './basic.js';
import { createCounter } from './counter-model.js';

export const $$counter = pipe(createCounter, modelRegistry());

const CounterDisplay = holo({
  models: {
    counter: (props: { counterId: string }) =>
      $$counter({ key: ['counter', props.counterId] }),
  },
  view: CounterDisplayView,
  read: ({ counter }) => ({ count: counter.$count, double: counter.$double }),
});

const CounterControls = holo({
  models: {
    counter: (props: { counterId: string }) =>
      $$counter({ key: ['counter', props.counterId] }),
  },
  view: CounterControlsView,
  write: ({ counter }) => ({
    onIncrement: counter.increment,
    onDecrement: counter.decrement,
  }),
});

export function KeyedCounter({ counterId }: { counterId: string }) {
  return (
    <section>
      <h2>Reward tokens · {counterId}</h2>
      <CounterDisplay counterId={counterId} />
      <CounterControls counterId={counterId} />
    </section>
  );
}

export function ModelCounters() {
  return (
    <>
      <KeyedCounter counterId="Nova" />
      <KeyedCounter counterId="Nova" />
      <KeyedCounter counterId="Orion" />
    </>
  );
}

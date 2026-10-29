import { holo } from 'jotai-holo';
import { createCounter } from './counter-model.js';

const $$counter = createCounter();

export function CounterDisplayView({
  count,
  double,
}: {
  count: number;
  double: number;
}) {
  return (
    <output>
      {count} × 2 = {double}
    </output>
  );
}

export function CounterControlsView({
  onIncrement,
  onDecrement,
}: {
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div>
      <button aria-label="Spend reward token" onClick={onDecrement}>
        −
      </button>
      <button aria-label="Add reward token" onClick={onIncrement}>
        +
      </button>
    </div>
  );
}

const CounterDisplay = holo({
  view: CounterDisplayView,
  read: { count: $$counter.$count, double: $$counter.$double },
});

const CounterControls = holo({
  view: CounterControlsView,
  write: {
    onIncrement: $$counter.increment,
    onDecrement: $$counter.decrement,
  },
});

export function BasicCounter() {
  return (
    <section>
      <h2>Reward tokens</h2>
      <CounterDisplay />
      <CounterControls />
    </section>
  );
}

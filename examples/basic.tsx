import { holo } from 'jotai-holo';
import { createCounter } from './counter-model.js';

const $$counter = createCounter();
export function CounterView({
  title,
  count,
  double,
  onIncrement,
  onDecrement,
}: {
  title: string;
  count: number;
  double: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <section>
      <h2>{title}</h2>
      <output>
        {count} × 2 = {double}
      </output>
      <div>
        <button onClick={onDecrement}>−</button>
        <button onClick={onIncrement}>+</button>
      </div>
    </section>
  );
}

export const BasicCounter = holo({
  view: CounterView,
  read: { count: $$counter.$count, double: $$counter.$double },
  write: {
    onIncrement: $$counter.increment,
    onDecrement: $$counter.decrement,
  },
  staticProps: { title: 'State + actions' },
});

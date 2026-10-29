import { useState } from 'react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';

// #region input-model
function createCounterModel() {
  const $balance = stateAtom(0);
  const $count = stateAtom(
    (get) => get($balance),
    (_get, set, count: number) => set($balance, Math.max(0, count)),
  );

  const increment = actionAtom((get, set) => {
    set($count, get($count) + 1);
  });

  return { $count, increment };
}

export const $$counter = pipe(createCounterModel, modelRegistry());
// #endregion input-model

// #region input-view
function CountView({
  title,
  count,
  onChange,
}: {
  counterId: string;
  title: string;
  count: number;
  onChange: (count: number) => void;
}) {
  const [empty, setEmpty] = useState(false);

  return (
    <label>
      {title}
      <input
        type="number"
        min="0"
        value={empty ? '' : count}
        onChange={(event) => {
          const value = event.target.value;
          setEmpty(value === '');
          if (value !== '') {
            onChange(Number(value));
          }
        }}
        onBlur={() => setEmpty(false)}
      />
    </label>
  );
}

const Count = holo({
  models: {
    counter: (props: { counterId: string }) =>
      $$counter({ key: ['counter', props.counterId] }),
  },
  view: CountView,
  read: ({ counter }) => ({ count: counter.$count }),
  write: ({ counter }) => ({ onChange: counter.$count }),
});

function IncrementView({
  onIncrement,
}: {
  counterId: string;
  onIncrement: () => void;
}) {
  return <button onClick={onIncrement}>+</button>;
}

const Increment = holo({
  models: {
    counter: (props: { counterId: string }) =>
      $$counter({ key: ['counter', props.counterId] }),
  },
  view: IncrementView,
  write: ({ counter }) => ({ onIncrement: counter.increment }),
});

function CounterView({
  counterId,
  title,
}: {
  counterId: string;
  initial: number;
  title: string;
}) {
  return (
    <section>
      <Count counterId={counterId} title={title} />
      <Increment counterId={counterId} />
    </section>
  );
}
// #endregion input-view

// #region input-binding
export const Counter = holo({
  models: {
    counter: (props: { counterId: string }) =>
      $$counter({ key: ['counter', props.counterId] }),
  },

  view: CounterView,

  input: ({ counter }) => ({ initial: counter.$count }),

  static: { title: 'Reward tokens' },
});
// #endregion input-binding

// #region input-usage
export function Example() {
  return <Counter counterId="Nova" initial={5} />;
}
// #endregion input-usage

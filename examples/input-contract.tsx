import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';

// #region input-model
function createCounterModel() {
  const $count = stateAtom(0);

  const increment = actionAtom((_get, set) => {
    set($count, (count) => count + 1);
  });

  return { $count, increment };
}

export const $$counter = pipe(createCounterModel, modelRegistry());
// #endregion input-model

// #region input-view
type CounterViewProps = {
  counterId: string;
  initial: number;
  title: string;
  count: number;
  onChange: (count: number) => void;
  onIncrement: () => void;
};

function CounterView({
  title,
  count,
  onChange,
  onIncrement,
}: CounterViewProps) {
  return (
    <section>
      <label>
        {title}
        <input
          type="number"
          value={count}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
      <button onClick={onIncrement}>+</button>
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

  read: ({ counter }) => ({ count: counter.$count }),

  write: ({ counter }) => ({
    onChange: counter.$count,
    onIncrement: counter.increment,
  }),

  inputProps: ({ counter }) => ({ initial: counter.$count }),

  staticProps: { title: 'Counter' },
});
// #endregion input-binding

// #region input-usage
export function Example() {
  return <Counter counterId="users" initial={5} />;
}
// #endregion input-usage

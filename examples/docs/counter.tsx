import { Trans } from '@lingui/react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import {
  CountView,
  CounterControlsView,
  CounterTitleView,
  DoubledView,
} from './counter-views.js';

// #region counter
// #region counter-state
const $count = stateAtom(0);

const $double = stateAtom((get) => get($count) * 2);

const increment = actionAtom((_get, set, amount: number) =>
  set($count, (count) => Math.max(0, count + amount)),
);
// #endregion counter-state

const CounterTitle = holo({
  view: CounterTitleView,
  static: { title: <Trans id="Reward tokens" /> },
});

// #region counter-read
const Count = holo({
  view: CountView,
  read: { count: $count },
});

const Doubled = holo({
  view: DoubledView,
  read: { doubled: $double },
});
// #endregion counter-read

// #region counter-write
const CounterControls = holo({
  view: CounterControlsView,
  write: { onIncrement: increment },
});
// #endregion counter-write

// #region counter-layout
function Counter() {
  return (
    <div className="demo-counter">
      <CounterTitle />
      <Count />
      <Doubled />
      <CounterControls />
    </div>
  );
}
// #endregion counter-layout
// #endregion counter

export default Counter;

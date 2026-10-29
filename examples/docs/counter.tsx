import { Trans } from '@lingui/react';
import { useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';

// #region counter
const $count = stateAtom(0);

const $double = stateAtom((get) => get($count) * 2);

const increment = actionAtom((_get, set, amount: number) =>
  set($count, (count) => Math.max(0, count + amount)),
);

function CounterTitleView({ title }: { title: ReactNode }) {
  return <span className="demo-eyebrow">{title}</span>;
}

const CounterTitle = holo({
  view: CounterTitleView,
  static: { title: <Trans id="Reward tokens" /> },
});

function CountView({ count }: { count: number }) {
  return (
    <output className="demo-number" aria-live="polite">
      {count}
    </output>
  );
}

const Count = holo({
  view: CountView,
  read: { count: $count },
});

function DoubledView({ doubled }: { doubled: number }) {
  const { t } = useLingui();

  return (
    <p>
      {t`Bonus points × 2`}: <strong>{doubled}</strong>
    </p>
  );
}

const Doubled = holo({
  view: DoubledView,
  read: { doubled: $double },
});

function CounterControlsView({
  onIncrement,
}: {
  onIncrement: (amount: number) => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button
        type="button"
        onClick={() => onIncrement(-1)}
        aria-label={t`Decrement`}
      >
        −
      </button>
      <button
        type="button"
        onClick={() => onIncrement(1)}
        aria-label={t`Increment`}
      >
        +
      </button>
    </div>
  );
}

const CounterControls = holo({
  view: CounterControlsView,
  write: { onIncrement: increment },
});

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
// #endregion counter

export default Counter;

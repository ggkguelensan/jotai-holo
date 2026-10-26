import { Trans } from '@lingui/react';
import { useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';

// #region counter
const $count = stateAtom(0);

const $double = stateAtom((get) => get($count) * 2);

const increment = actionAtom((_get, set, amount: number) => set($count, (count) => count + amount));

function CounterView({
  count,
  doubled,
  onIncrement,
  title,
}: {
  count: number;
  doubled: number;
  onIncrement: (amount: number) => void;
  title: ReactNode;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-counter">
      <span className="demo-eyebrow">{title}</span>
      <output className="demo-number" aria-live="polite">
        {count}
      </output>
      <p>
        {t`Derived × 2`}: <strong>{doubled}</strong>
      </p>
      <div className="demo-controls">
        <button type="button" onClick={() => onIncrement(-1)} aria-label={t`Decrement`}>
          −
        </button>
        <button type="button" onClick={() => onIncrement(1)} aria-label={t`Increment`}>
          +
        </button>
      </div>
    </div>
  );
}

const Counter = holo({
  core: CounterView,
  state: { count: $count, doubled: $double },
  actions: { onIncrement: increment },
  bindProps: { title: <Trans id="One model, ordinary props" /> },
});
// #endregion counter

export default Counter;

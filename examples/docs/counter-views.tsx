import { useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';

export function CounterTitleView({ title }: { title: ReactNode }) {
  return <span className="demo-eyebrow">{title}</span>;
}

// #region counter-read-contracts
export type CountViewProps = { count: number };
export type DoubledViewProps = { doubled: number };
// #endregion counter-read-contracts

export function CountView({ count }: CountViewProps) {
  return (
    <output className="demo-number" aria-live="polite">
      {count}
    </output>
  );
}

export function DoubledView({ doubled }: DoubledViewProps) {
  const { t } = useLingui();

  return (
    <p>
      {t`Bonus points × 2`}: <strong>{doubled}</strong>
    </p>
  );
}

// #region counter-write-contract
export type CounterControlsViewProps = {
  onIncrement: (amount: number) => void;
};
// #endregion counter-write-contract

export function CounterControlsView({ onIncrement }: CounterControlsViewProps) {
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

import { useLingui } from '@lingui/react/macro';
import { useLayoutEffect, useState } from 'react';
import type { EditHandlers } from './editing.js';

export function CameraView({
  address,
  onSelect,
  onMove,
}: {
  address: string;
  onSelect: (address: string) => void;
  onMove: EditHandlers['onMove'];
}) {
  const { t } = useLingui();
  const [draft, setDraft] = useState(address);
  const [error, setError] = useState(false);
  useLayoutEffect(() => setDraft(address), [address]);
  return (
    <div className="sheet-camera">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSelect(draft.trim().toUpperCase());
            setError(false);
          } catch {
            setError(true);
          }
        }}
      >
        <label>
          {t`Go to cell`}
          <input
            value={draft}
            aria-invalid={error || undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(false);
            }}
          />
        </label>
        <button type="submit">{t`Go`}</button>
      </form>
      <div className="sheet-directions">
        <button
          aria-label={t`Move left`}
          onClick={() => onMove({ row: 0, column: -1 })}
        >
          ←
        </button>
        <button
          aria-label={t`Move up`}
          onClick={() => onMove({ row: -1, column: 0 })}
        >
          ↑
        </button>
        <button
          aria-label={t`Move down`}
          onClick={() => onMove({ row: 1, column: 0 })}
        >
          ↓
        </button>
        <button
          aria-label={t`Move right`}
          onClick={() => onMove({ row: 0, column: 1 })}
        >
          →
        </button>
      </div>
      {error && (
        <small role="alert">{t`Choose an address inside this sheet.`}</small>
      )}
    </div>
  );
}

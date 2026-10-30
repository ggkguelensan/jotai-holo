import { useLingui } from '@lingui/react/macro';
import { useLayoutEffect, useRef, useState } from 'react';
import type { Dimensions } from '../../coordinates.js';

export function DimensionView({
  dimension,
  value,
  dimensions,
  onResize,
}: {
  dimension: keyof Dimensions;
  value: number;
  dimensions: Dimensions;
  onResize: (size: Dimensions) => void;
}) {
  const { t } = useLingui();
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState(false);
  const focused = useRef(false);
  useLayoutEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  const apply = (text: string) => {
    const next = Number(text);
    if (!text.trim() || !Number.isInteger(next) || next < 1 || next > 1000) {
      setError(true);
      return;
    }
    onResize({ ...dimensions, [dimension]: next });
    setError(false);
    setDraft(String(next));
  };
  const label = dimension === 'rows' ? t`Rows` : t`Columns`;
  return (
    <div className="sheet-dimension">
      <label>
        <span>{label}</span>
        <input
          aria-label={label}
          aria-invalid={error || undefined}
          inputMode="numeric"
          value={draft}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(false);
          }}
          onBlur={() => {
            focused.current = false;
            apply(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              apply(draft);
            }
            if (event.key === 'Escape') {
              setDraft(String(value));
              setError(false);
            }
          }}
        />
      </label>
      <button
        aria-label={dimension === 'rows' ? t`Fewer rows` : t`Fewer columns`}
        disabled={value <= 1}
        onClick={() => apply(String(value - 1))}
      >
        −
      </button>
      <button
        aria-label={dimension === 'rows' ? t`More rows` : t`More columns`}
        disabled={value >= 1000}
        onClick={() => apply(String(value + 1))}
      >
        +
      </button>
      {error && (
        <small role="alert">{t`Enter a whole number from 1 to 1000.`}</small>
      )}
    </div>
  );
}

import { useLingui } from '@lingui/react/macro';
import { useLayoutEffect, useRef } from 'react';
import { isCellError, type CellValue } from '../../formulas.js';
import { navigate, type EditHandlers } from './editing.js';

export function CellView({
  address,
  input,
  value,
  selected,
  editing,
  draft,
  focusVersion,
  onSelect,
  onDraft,
  ...handlers
}: {
  address: string;
  input: string;
  value: CellValue;
  selected: boolean;
  editing: boolean;
  draft: string;
  focusVersion: number;
  onSelect: (address: string) => void;
  onDraft: (value: string) => void;
} & EditHandlers) {
  const { t, i18n } = useLingui();
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (selected && focusVersion > 0) element?.focus();
  }, [selected, address, focusVersion]);
  const display =
    typeof value === 'number'
      ? new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 2 }).format(
          value,
        )
      : value;
  return (
    <input
      ref={ref}
      aria-label={address}
      aria-invalid={isCellError(value) || undefined}
      data-address={address}
      data-selected={selected || undefined}
      data-numeric={typeof value === 'number' || undefined}
      data-formula={input.trim().startsWith('=') || undefined}
      className="sheet-cell"
      autoComplete="off"
      spellCheck={false}
      maxLength={512}
      readOnly={!editing}
      title={
        isCellError(value) ? t`Check the formula and its references.` : input
      }
      value={editing ? draft : display}
      onChange={(event) => onDraft(event.target.value)}
      onFocus={() => onSelect(address)}
      onDoubleClick={() => handlers.onBegin()}
      onBlur={() => handlers.onCommit()}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          if (handlers.onTab(event.shiftKey)) event.preventDefault();
        } else navigate(event, editing, handlers);
      }}
    />
  );
}

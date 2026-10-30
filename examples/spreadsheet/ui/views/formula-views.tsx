import { useLingui } from '@lingui/react/macro';
import type { EditHandlers } from './editing.js';

export function FormulaView({
  address,
  expression,
  onBegin,
  onDraft,
  ...handlers
}: {
  address: string;
  expression: string;
  onDraft: (value: string) => void;
} & EditHandlers) {
  const { t } = useLingui();
  return (
    <label className="sheet-formula">
      <span className="sheet-address">{address}</span>
      <span className="sheet-fx" aria-hidden="true">
        ƒx
      </span>
      <input
        aria-label={t`Formula for the selected cell`}
        value={expression}
        maxLength={512}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => onBegin()}
        onChange={(event) => onDraft(event.target.value)}
        onBlur={handlers.onCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            event.key === 'Enter' ? handlers.onCommit() : handlers.onCancel();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

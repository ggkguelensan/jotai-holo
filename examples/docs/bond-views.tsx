import { useLingui } from '@lingui/react/macro';

export function ReceiptOptionView({
  enabled,
  onEnabled,
}: {
  enabled: boolean;
  onEnabled: (value: boolean) => void;
}) {
  const { t } = useLingui();

  return (
    <label className="demo-checkbox">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onEnabled(e.target.checked)}
      />
      {t`Generate receipt`}
    </label>
  );
}

export function SubmitOrderView({ onSubmit }: { onSubmit: () => void }) {
  const { t } = useLingui();

  return (
    <button type="button" onClick={() => onSubmit()}>
      {t`Buy gift copies`}
    </button>
  );
}

export function ReceiptView({ message }: { message: number | null }) {
  const { t } = useLingui();

  return (
    <output aria-live="polite">
      {message === null
        ? t`No receipts yet`
        : `${t`Receipt for order`} #${message}`}
    </output>
  );
}

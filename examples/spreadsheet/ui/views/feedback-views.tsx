import { useLingui } from '@lingui/react/macro';
import type { SheetKey, StorageStatus } from '../../models/types.js';

export function SheetStatusView({
  status,
  sheetId,
  onRetry,
}: SheetKey & {
  status: StorageStatus;
  onRetry: (id: string) => Promise<void>;
}) {
  const { t } = useLingui();
  return (
    <div className="sheet-status" data-state={status} role="status">
      {status === 'loading'
        ? t`Loading sheet…`
        : status === 'saving'
          ? t`Saving…`
          : status === 'error'
            ? t`Could not save or load this sheet.`
            : t`Saved locally`}
      {status === 'error' && (
        <button
          onClick={() => {
            void onRetry(sheetId);
          }}
        >{t`Retry`}</button>
      )}
    </div>
  );
}

export function SheetHelpView() {
  const { t } = useLingui();
  return (
    <p className="sheet-help">{t`Arrows select. Enter edits; Enter again saves. Escape cancels. Double-click a tab to rename it.`}</p>
  );
}

export function BookErrorView() {
  const { t } = useLingui();
  return (
    <p role="alert">{t`Could not save the sheet list. Your open sheets remain in memory.`}</p>
  );
}

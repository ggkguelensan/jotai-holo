import { useLingui } from '@lingui/react/macro';
import { holo } from 'jotai-holo';
import { reset, selectCell } from '../workbook.js';
import type { SheetKey } from '../models/types.js';
import type { CellValue } from '../formulas.js';
import giftBudget from '../gift-budget.json';

function ResetView({
  sheetId,
  onReset,
}: SheetKey & { onReset: (id: string) => void }) {
  const { t } = useLingui();
  return <button onClick={() => onReset(sheetId)}>{t`Reset sheet`}</button>;
}

export const Reset = holo({ view: ResetView, write: { onReset: reset } });

function TotalView({ value }: { value: CellValue }) {
  const { t, i18n } = useLingui();
  return (
    <div className="sheet-total">
      <span>{t`Bundle total`}</span>
      <output>
        {typeof value === 'number'
          ? new Intl.NumberFormat(i18n.locale, {
              style: 'currency',
              currency: 'EUR',
            }).format(value)
          : value}
      </output>
    </div>
  );
}

export const Total = holo({
  models: {
    cell: ({ sheetId }: SheetKey) =>
      selectCell({ sheetId, address: giftBudget.totalCell }),
  },
  view: TotalView,
  read: ({ cell }) => ({ value: cell.$value }),
});

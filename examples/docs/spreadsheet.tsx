import { useLingui } from '@lingui/react/macro';
import { useState, type KeyboardEvent } from 'react';
import { holo, holoList } from 'jotai-holo';
import {
  columns,
  createSpreadsheet,
  rowCount,
  type SheetKey,
} from '../spreadsheet/model.js';
import { isCellError, type CellValue } from '../spreadsheet/formulas.js';

function move(event: KeyboardEvent<HTMLInputElement>, address: string) {
  const input = event.currentTarget;
  if (event.nativeEvent.isComposing) return;
  if (event.key === 'Escape') {
    input.blur();
    return;
  }
  const column = columns.indexOf(address[0] as (typeof columns)[number]);
  const row = Number(address.slice(1));
  let nextColumn = column;
  let nextRow = row;
  if (event.key === 'Enter') nextRow += event.shiftKey ? -1 : 1;
  else if (event.key === 'ArrowDown') nextRow++;
  else if (event.key === 'ArrowUp') nextRow--;
  else if (event.key === 'ArrowLeft' && input.selectionStart === 0)
    nextColumn--;
  else if (
    event.key === 'ArrowRight' &&
    input.selectionStart === input.value.length
  )
    nextColumn++;
  else return;
  event.preventDefault();
  if (
    nextRow < 1 ||
    nextRow > rowCount ||
    nextColumn < 0 ||
    nextColumn >= columns.length
  )
    return;
  const target = `${columns[nextColumn]}${nextRow}`;
  input
    .closest('table')
    ?.querySelector<HTMLInputElement>(`input[data-address="${target}"]`)
    ?.focus();
}

export function CellView({
  address,
  input,
  value,
  onChange,
  onSelect,
}: {
  address: string;
  input: string;
  value: CellValue;
  onChange: (value: string) => void;
  onSelect: (address: string) => void;
}) {
  const { t, i18n } = useLingui();
  const [editing, setEditing] = useState(false);
  const display =
    typeof value === 'number'
      ? new Intl.NumberFormat(i18n.locale, {
          maximumFractionDigits: 2,
        }).format(value)
      : value;
  const error = isCellError(value);

  return (
    <input
      aria-label={address}
      aria-invalid={error || undefined}
      data-address={address}
      data-numeric={typeof value === 'number' || undefined}
      data-formula={input.trim().startsWith('=') || undefined}
      className="sheet-cell"
      autoComplete="off"
      spellCheck={false}
      maxLength={512}
      title={error ? t`Check the formula and its references.` : input}
      value={editing ? input : display}
      onChange={(event) => onChange(event.target.value)}
      onFocus={() => {
        setEditing(true);
        onSelect(address);
      }}
      onBlur={() => setEditing(false)}
      onKeyDown={(event) => move(event, address)}
    />
  );
}

function FormulaView({
  address,
  expression,
  onChange,
}: {
  address: string;
  expression: string;
  onChange: (value: string) => void;
}) {
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
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TotalView({ value }: { value: CellValue }) {
  const { t, i18n } = useLingui();

  return (
    <div className="sheet-total">
      <span>{t`Bundle total`}</span>
      <output aria-live="polite">
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

function ResetView({ onReset }: { onReset: () => void }) {
  const { t } = useLingui();
  return <button onClick={onReset}>{t`Reset sheet`}</button>;
}

function SheetHeadingView({ sheetId }: SheetKey) {
  const { t } = useLingui();
  return (
    <header className="sheet-heading">
      <div>
        <span className="demo-eyebrow">{t`Game gift bundle · budget`}</span>
        <p>{t`Change the copies. The bundle total follows.`}</p>
      </div>
      <Reset sheetId={sheetId} />
    </header>
  );
}

type Column = (typeof columns)[number];

function ColumnView({ column }: { column: Column }) {
  const { t } = useLingui();
  const labels = {
    A: t`Game`,
    B: t`Copies / rate`,
    C: t`Price / base, €`,
    D: t`Amount, €`,
  };
  return (
    <th scope="col">
      <span>{column}</span>
      <small>{labels[column]}</small>
    </th>
  );
}

function SheetHelpView() {
  const { t } = useLingui();
  return (
    <>
      <p className="sheet-help">
        {t`Rows 1–3: copies × price. Row 4: 10% tax. Row 5: total.`}
      </p>
      <p className="sheet-help">
        {t`Select a cell to edit. Enter moves down; Tab moves across.`}
      </p>
    </>
  );
}

// #region spreadsheet
const { selectSheet, selectCell, $rows, $columns } = createSpreadsheet();

const FormulaBar = holo({
  models: { sheet: selectSheet },
  view: FormulaView,
  read: ({ sheet }) => ({
    address: sheet.$selected,
    expression: sheet.$formula,
  }),
  write: ({ sheet }) => ({ onChange: sheet.$formula }),
});

const Cell = holo({
  models: { cell: selectCell, sheet: selectSheet },
  view: CellView,
  read: ({ cell }) => ({ input: cell.$input, value: cell.$value }),
  write: ({ cell, sheet }) => ({
    onChange: cell.$input,
    onSelect: sheet.$selected,
  }),
});

function CellSlotView({
  column,
  row,
  sheetId,
}: SheetKey & { column: Column; row: number }) {
  return (
    <td>
      <Cell sheetId={sheetId} address={`${column}${row}`} />
    </td>
  );
}

const RowCells = holoList({
  source: $columns,
  view: CellSlotView,
  getKey: (column) => column,
  mapItem: (column) => ({ column }),
});

function RowView({ row, sheetId }: SheetKey & { row: number }) {
  return (
    <tr data-total={row === 5 || undefined}>
      <th scope="row">{row}</th>
      <RowCells row={row} sheetId={sheetId} />
    </tr>
  );
}

const Rows = holoList({
  source: $rows,
  view: RowView,
  getKey: (row) => row,
  mapItem: (row) => ({ row }),
});

const ColumnHeaders = holoList({
  source: $columns,
  view: ColumnView,
  getKey: (column) => column,
  mapItem: (column) => ({ column }),
});

function TableHeadingView() {
  const { t } = useLingui();
  return (
    <thead>
      <tr>
        <th aria-label={t`Row`} />
        <ColumnHeaders />
      </tr>
    </thead>
  );
}

function TableView({ sheetId }: SheetKey) {
  const { t } = useLingui();
  return (
    <div className="sheet-scroll">
      <table className="sheet-table">
        <caption className="sheet-sr-only">{t`Gift budget`}</caption>
        <TableHeadingView />
        <tbody>
          <Rows sheetId={sheetId} />
        </tbody>
      </table>
    </div>
  );
}

const Total = holo({
  models: {
    cell: ({ sheetId }: SheetKey) => selectCell({ sheetId, address: 'D5' }),
  },
  view: TotalView,
  read: ({ cell }) => ({ value: cell.$value }),
});

const Reset = holo({
  models: { sheet: selectSheet },
  view: ResetView,
  write: ({ sheet }) => ({ onReset: sheet.reset }),
});

function SheetView({ sheetId = 'gift-budget' }: { sheetId?: string }) {
  return (
    <section className="sheet-demo">
      <SheetHeadingView sheetId={sheetId} />
      <FormulaBar sheetId={sheetId} />
      <TableView sheetId={sheetId} />
      <Total sheetId={sheetId} />
      <SheetHelpView />
    </section>
  );
}
// #endregion spreadsheet

export default SheetView;

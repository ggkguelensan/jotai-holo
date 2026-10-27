import { useLingui } from '@lingui/react/macro';
import { useState, type KeyboardEvent } from 'react';
import { holo } from 'jotai-holo';
import { columns, createSpreadsheet, rowCount } from '../spreadsheet/model.js';
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
  onSelect: () => void;
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
        onSelect();
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
      <span>{t`Project estimate`}</span>
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

// #region spreadsheet
const $$sheet = createSpreadsheet();

const FormulaBar = holo({
  view: FormulaView,
  read: {
    address: $$sheet.$selected,
    expression: $$sheet.$formula,
  },
  write: { onChange: $$sheet.$formula },
});

// Create bindings once, outside React render. Each cell subscribes separately.
const Cells = Object.fromEntries(
  $$sheet.addresses.map((address) => {
    const cell = $$sheet.cells[address]!;

    return [
      address,
      holo({
        view: CellView,
        props: { address },
        read: { input: cell.$input, value: cell.$value },
        write: { onChange: cell.$input },
        // Selection belongs to the sheet; typing belongs to this cell.
        // onSelect is a plain UI callback, passed by the parent below.
      }),
    ];
  }),
);

const Total = holo({
  view: TotalView,
  read: { value: $$sheet.cells.D5!.$value },
});
// #endregion spreadsheet

// Bind native writable atoms without adding a hook wrapper.
const Reset = holo({
  view: function ResetView({ onReset }: { onReset: () => void }) {
    const { t } = useLingui();
    return <button onClick={onReset}>{t`Reset sheet`}</button>;
  },
  write: { onReset: $$sheet.reset },
});

function SheetView({ onSelect }: { onSelect: (address: string) => void }) {
  const { t } = useLingui();
  const labels = [
    t`Workstream`,
    t`Hours / ratio`,
    t`Rate / base, €`,
    t`Amount, €`,
  ];

  return (
    <section className="sheet-demo">
      <header className="sheet-heading">
        <div>
          <span className="demo-eyebrow">{t`Website launch · estimate`}</span>
          <p>{t`Change the hours. The estimate follows.`}</p>
        </div>
        <Reset />
      </header>
      <FormulaBar />
      <div className="sheet-scroll">
        <table className="sheet-table">
          <caption className="sheet-sr-only">{t`Project budget`}</caption>
          <thead>
            <tr>
              <th aria-label={t`Row`} />
              {columns.map((column, index) => (
                <th key={column} scope="col">
                  <span>{column}</span>
                  <small>{labels[index]}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, index) => index + 1).map(
              (row) => (
                <tr key={row} data-total={row === 5 || undefined}>
                  <th scope="row">{row}</th>
                  {columns.map((column) => {
                    const address = `${column}${row}`;
                    const Cell = Cells[address]!;
                    return (
                      <td key={address}>
                        <Cell onSelect={() => onSelect(address)} />
                      </td>
                    );
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <Total />
      <p className="sheet-help">
        {t`Rows 1–3: hours × rate. Row 4: 10% reserve. Row 5: total.`}
      </p>
      <p className="sheet-help">
        {t`Select a cell to edit. Enter moves down; Tab moves across.`}
      </p>
    </section>
  );
}

const Spreadsheet = holo({
  view: SheetView,
  write: { onSelect: $$sheet.$selected },
});

export default Spreadsheet;

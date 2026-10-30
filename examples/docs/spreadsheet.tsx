import { useLingui } from '@lingui/react/macro';
import { atom } from 'jotai';
import { holo, holoList } from 'jotai-holo';
import giftBudget from '../spreadsheet/gift-budget.json';
import {
  columnName,
  addressOf,
  type Dimensions,
} from '../spreadsheet/coordinates.js';
import type { ViewKey, SheetKey } from '../spreadsheet/model.js';
import {
  createWorkbook,
  type Workbook,
  type StorageStatus,
} from '../spreadsheet/workbook.js';
import { browserStorage } from '../spreadsheet/storage.js';
import type { CellValue } from '../spreadsheet/formulas.js';
import {
  CellView,
  FormulaView,
  DimensionView,
  SheetStatusView,
  CameraView,
  SheetTabView,
  TableViewportView,
  SheetHelpView,
  BookErrorView,
} from './spreadsheet-views.js';

const columnSlots = atom([0, 1, 2, 3]);
const rowSlots = atom([0, 1, 2, 3, 4, 5, 6, 7]);

export function createWorkbookBindings(workbook: Workbook) {
  const { selectSheet, selectView, selectCell, $$workbook } = workbook;
  const FormulaBar = holo({
    models: { view: selectView },
    view: FormulaView,
    read: ({ view }) => ({
      address: view.$selected,
      expression: view.$formula,
    }),
    write: ({ view }) => ({
      onBegin: view.begin,
      onDraft: view.$draft,
      onCommit: view.commit,
      onCancel: view.cancel,
      onMove: view.move,
      onTab: view.tab,
    }),
  });
  // #region cell-binding
  const Cell = holo({
    models: { cell: selectCell, view: selectView },
    view: CellView,
    read: ({ cell, view }) => ({
      input: cell.$input,
      value: cell.$value,
      selected: atom((get) => get(view.$selected) === cell.address),
      focusVersion: atom((get) =>
        get(view.$selected) === cell.address ? get(view.$focus) : 0,
      ),
      editing: atom(
        (get) => get(view.$selected) === cell.address && get(view.$editing),
      ),
      draft: atom((get) =>
        get(view.$selected) === cell.address ? get(view.$draft) : '',
      ),
    }),
    write: ({ view }) => ({
      onSelect: view.select,
      onDraft: view.$draft,
      onBegin: view.begin,
      onCommit: view.commit,
      onCancel: view.cancel,
      onMove: view.move,
      onTab: view.tab,
    }),
  });
  // #endregion cell-binding

  function CellSlotView({
    sheetId,
    viewId,
    row,
    slot,
    offset,
    count,
  }: ViewKey & { row: number; slot: number; offset: number; count: number }) {
    return slot < count ? (
      <td role="gridcell" aria-colindex={offset + slot + 2}>
        <Cell
          sheetId={sheetId}
          viewId={viewId}
          address={addressOf({ row, column: offset + slot })}
        />
      </td>
    ) : null;
  }
  const RowCells = holoList({
    source: columnSlots,
    view: CellSlotView,
    getKey: (slot) => slot,
    mapItem: (slot) => ({ slot }),
  });
  function RowView({
    sheetId,
    viewId,
    slot,
    camera,
    size,
    window,
  }: ViewKey & {
    slot: number;
    camera: { row: number; column: number };
    size: Dimensions;
    window: Dimensions;
  }) {
    const row = camera.row + slot;
    return slot < Math.min(size.rows, window.rows) ? (
      <tr
        role="row"
        aria-rowindex={row + 2}
        data-slot={slot}
        data-total={
          (sheetId === 'gifts' && row + 1 === giftBudget.totalRow) || undefined
        }
      >
        <th scope="row">{row + 1}</th>
        <RowCells
          sheetId={sheetId}
          viewId={viewId}
          row={row}
          offset={camera.column}
          count={Math.min(size.columns, window.columns)}
        />
      </tr>
    ) : null;
  }
  const Row = holo({
    models: { view: selectView },
    view: RowView,
    read: ({ view }) => ({
      camera: view.$camera,
      size: view.$size,
      window: view.$window,
    }),
  });
  const Rows = holoList({
    source: rowSlots,
    view: Row,
    getKey: (slot) => slot,
    mapItem: (slot) => ({ slot }),
  });
  function ColumnView({
    slot,
    offset,
    count,
  }: {
    slot: number;
    offset: number;
    count: number;
  }) {
    return slot < count ? (
      <th scope="col">{columnName(offset + slot)}</th>
    ) : null;
  }
  const Columns = holoList({
    source: columnSlots,
    view: ColumnView,
    getKey: (slot) => slot,
    mapItem: (slot) => ({ slot }),
  });
  function TableHeadingView({
    camera,
    size,
    window,
  }: {
    camera: { column: number };
    size: Dimensions;
    window: Dimensions;
  }) {
    const { t } = useLingui();
    return (
      <thead>
        <tr role="row">
          <th aria-label={t`Row`} />
          <Columns
            offset={camera.column}
            count={Math.min(size.columns, window.columns)}
          />
        </tr>
      </thead>
    );
  }
  const TableHeading = holo({
    models: { view: selectView },
    view: TableHeadingView,
    read: ({ view }) => ({
      camera: view.$camera,
      size: view.$size,
      window: view.$window,
    }),
  });
  function TableView({
    sheetId,
    viewId,
    size,
    onWindow,
  }: ViewKey & { size: Dimensions; onWindow: (size: Dimensions) => void }) {
    return (
      <TableViewportView size={size} onWindow={onWindow}>
        <TableHeading sheetId={sheetId} viewId={viewId} />
        <tbody>
          <Rows sheetId={sheetId} viewId={viewId} />
        </tbody>
      </TableViewportView>
    );
  }
  const Table = holo({
    models: { view: selectView },
    view: TableView,
    read: ({ view }) => ({ size: view.$size }),
    write: ({ view }) => ({ onWindow: view.setWindow }),
  });
  const Dimension = holo({
    models: { sheet: selectSheet },
    view: DimensionView,
    read: ({ sheet }) => ({ dimensions: sheet.$dimensions }),
    write: ({ sheet }) => ({ onResize: sheet.resize }),
  });
  function DimensionsView({ sheetId, size }: SheetKey & { size: Dimensions }) {
    return (
      <div className="sheet-dimensions">
        <Dimension sheetId={sheetId} dimension="columns" value={size.columns} />
        <Dimension sheetId={sheetId} dimension="rows" value={size.rows} />
      </div>
    );
  }
  const SheetDimensions = holo({
    models: { sheet: selectSheet },
    view: DimensionsView,
    read: ({ sheet }) => ({ size: sheet.$dimensions }),
  });
  const Camera = holo({
    models: { view: selectView },
    view: CameraView,
    read: ({ view }) => ({ address: view.$selected }),
    write: ({ view }) => ({ onSelect: view.select, onMove: view.move }),
  });
  const SheetStatus = holo({
    view: SheetStatusView,
    write: { onRetry: workbook.retry },
  });
  function ResetView({
    sheetId,
    onReset,
  }: SheetKey & { onReset: (id: string) => void }) {
    const { t } = useLingui();
    return <button onClick={() => onReset(sheetId)}>{t`Reset sheet`}</button>;
  }
  const Reset = holo({ view: ResetView, write: { onReset: workbook.reset } });
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
  const Total = holo({
    models: {
      cell: ({ sheetId }: SheetKey) =>
        selectCell({ sheetId, address: giftBudget.totalCell }),
    },
    view: TotalView,
    read: ({ cell }) => ({ value: cell.$value }),
  });
  // #region spreadsheet
  function WorkspaceView({
    sheetId,
    viewId,
    ready,
    status,
  }: ViewKey & { ready: boolean; status: StorageStatus }) {
    return (
      <section className="sheet-workspace" aria-busy={!ready}>
        {ready && (
          <>
            <div className="sheet-toolbar">
              <SheetDimensions sheetId={sheetId} />
              <Reset sheetId={sheetId} />
            </div>
            <FormulaBar sheetId={sheetId} viewId={viewId} />
            <Table sheetId={sheetId} viewId={viewId} />
            <Camera sheetId={sheetId} viewId={viewId} />
            {sheetId === 'gifts' && <Total sheetId={sheetId} />}
            <SheetHelpView />
          </>
        )}
        <SheetStatus sheetId={sheetId} status={status} />
      </section>
    );
  }
  // #endregion spreadsheet

  const Workspace = holo({
    models: { sheet: selectSheet, book: $$workbook },
    view: WorkspaceView,
    read: ({ sheet, book }) => ({
      ready: sheet.$loaded,
      status: atom((get) => {
        const status = get(book.$statuses)[sheet.sheetId] ?? 'loading';
        return status === 'saved' && get(book.$saving) ? 'saving' : status;
      }),
    }),
  });
  function TabBindingView({
    id,
    title,
    activeId,
    statuses,
    onSwitch,
    onRename,
  }: {
    id: string;
    title: string;
    activeId: string;
    statuses: Record<string, StorageStatus>;
    onSwitch: (id: string) => void;
    onRename: (value: { id: string; title: string }) => void;
  }) {
    return (
      <SheetTabView
        id={id}
        title={title}
        active={activeId === id}
        status={statuses[id]}
        onSwitch={onSwitch}
        onRename={onRename}
      />
    );
  }
  const Tab = holo({
    models: { book: $$workbook },
    view: TabBindingView,
    read: ({ book }) => ({ activeId: book.$active, statuses: book.$statuses }),
    write: ({ book }) => ({
      onSwitch: book.switchSheet,
      onRename: book.renameSheet,
    }),
  });
  // A list of descriptors owns no sheet models.
  const $tabs = atom((get) => get(get($$workbook()).$sheets));
  const Tabs = holoList({
    source: $tabs,
    view: Tab,
    getKey: (sheet) => sheet.id,
    mapItem: (sheet) => ({ id: sheet.id, title: sheet.title }),
  });
  function AddView({ onAdd, ready }: { onAdd: () => void; ready: boolean }) {
    const { t } = useLingui();
    return (
      <button
        className="sheet-add"
        disabled={!ready}
        aria-label={t`Add sheet`}
        onClick={onAdd}
      >
        +
      </button>
    );
  }
  const Add = holo({
    models: { book: $$workbook },
    view: AddView,
    read: ({ book }) => ({ ready: book.$ready }),
    write: ({ book }) => ({ onAdd: book.addSheet }),
  });
  function BookView({
    activeId,
    ready,
    error,
    onRetry,
  }: {
    activeId: string;
    ready: boolean;
    error: boolean;
    onRetry: () => Promise<void>;
  }) {
    const { t } = useLingui();
    return (
      <section className="sheet-demo" aria-label={t`Workbook`}>
        <header className="sheet-heading">
          <span className="demo-eyebrow">{t`Game gift bundle · budget`}</span>
        </header>
        {ready ? (
          <Workspace key={activeId} sheetId={activeId} />
        ) : (
          <p role="status">
            {error ? t`Could not load the workbook.` : t`Loading workbook…`}
          </p>
        )}
        {error && (
          <button
            onClick={() => {
              void onRetry();
            }}
          >{t`Retry`}</button>
        )}
        <nav className="sheet-tabs" aria-label={t`Sheets`}>
          <Tabs />
          <Add />
        </nav>
        {ready && error && <BookErrorView />}
      </section>
    );
  }
  const Book = holo({
    models: { book: $$workbook },
    view: BookView,
    read: ({ book }) => ({
      activeId: book.$active,
      ready: book.$ready,
      error: book.$error,
    }),
    write: { onRetry: workbook.retryBook },
  });
  return { Book, Workspace, Cell };
}
// #region workbook-setup
const workbook = createWorkbook(browserStorage(), giftBudget, 'gift-budget-v1');
const { Book } = createWorkbookBindings(workbook);
export default Book;
// #endregion workbook-setup

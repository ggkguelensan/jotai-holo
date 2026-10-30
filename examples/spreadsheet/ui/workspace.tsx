import { atom } from 'jotai';
import { holo } from 'jotai-holo';
import { $$workbook, selectSheet } from '../workbook.js';
import type { ViewKey, StorageStatus } from '../models/types.js';
import { SheetDimensions } from './dimensions.js';
import { Reset, Total } from './gift-budget.js';
import { FormulaBar } from './formula-bar.js';
import { Table } from './table.js';
import { Camera } from './camera.js';
import { SheetStatus } from './sheet-status.js';
import { SheetHelpView } from './views/feedback-views.js';

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

export const Workspace = holo({
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

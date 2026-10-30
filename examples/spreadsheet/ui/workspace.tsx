import { holo } from 'jotai-holo';
import { selectSheet } from '../workbook.js';
import type { ViewKey } from '../models/types.js';
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
}: ViewKey & { ready: boolean }) {
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
      <SheetStatus sheetId={sheetId} />
    </section>
  );
}
// #endregion spreadsheet

export const Workspace = holo({
  models: { sheet: selectSheet },
  view: WorkspaceView,
  read: ({ sheet }) => ({ ready: sheet.$loaded }),
});

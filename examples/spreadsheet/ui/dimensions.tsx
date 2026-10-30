import { holo } from 'jotai-holo';
import { selectSheet } from '../workbook.js';
import type { SheetKey } from '../models/types.js';
import type { Dimensions } from '../coordinates.js';
import { DimensionView } from './views/dimensions-views.js';

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

export const SheetDimensions = holo({
  models: { sheet: selectSheet },
  view: DimensionsView,
  read: ({ sheet }) => ({ size: sheet.$dimensions }),
});

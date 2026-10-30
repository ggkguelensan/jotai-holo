import { holo, holoList } from 'jotai-holo';
import { selectView } from '../workbook.js';
import type { ViewKey } from '../models/types.js';
import { addressOf, type Dimensions } from '../coordinates.js';
import giftBudget from '../gift-budget.json';
import { columnSlots, rowSlots } from './slots.js';
import { Cell } from './cell.js';

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

export const Rows = holoList({
  source: rowSlots,
  view: Row,
  getKey: (slot) => slot,
  mapItem: (slot) => ({ slot }),
});

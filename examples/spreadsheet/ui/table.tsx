import { useLingui } from '@lingui/react/macro';
import { holo, holoList } from 'jotai-holo';
import { selectView } from '../workbook.js';
import type { ViewKey } from '../models/types.js';
import { columnName, type Dimensions } from '../coordinates.js';
import { columnSlots } from './slots.js';
import { Rows } from './row.js';
import { TableViewportView } from './views/viewport-views.js';

function ColumnView({
  slot,
  offset,
  count,
}: {
  slot: number;
  offset: number;
  count: number;
}) {
  return slot < count ? <th scope="col">{columnName(offset + slot)}</th> : null;
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

export const Table = holo({
  models: { view: selectView },
  view: TableView,
  read: ({ view }) => ({ size: view.$size }),
  write: ({ view }) => ({ onWindow: view.setWindow }),
});

import { atom } from 'jotai';
import { holo } from 'jotai-holo';
import { selectCell, selectView } from '../workbook.js';
import { CellView } from './views/cell-views.js';

// #region cell-binding
export const Cell = holo({
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

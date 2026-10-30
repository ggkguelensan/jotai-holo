import { ion, stateAtom } from 'jotai-holo/vanilla';
import { holo } from 'jotai-holo';
import { selectCell, selectView } from '../workbook.js';
import { CellView } from './views/cell-views.js';

// #region cell-binding
export const Cell = holo({
  models: { cell: selectCell, view: selectView },
  view: CellView,
  read: ({ cell, view }) => {
    const $selected = ion(
      view.$selected,
      (address) => address === cell.address,
    );
    return {
      input: cell.$input,
      value: cell.$value,
      selected: $selected,
      focusVersion: stateAtom((get) => (get($selected) ? get(view.$focus) : 0)),
      editing: stateAtom((get) => get($selected) && get(view.$editing)),
      draft: stateAtom((get) => (get($selected) ? get(view.$draft) : '')),
    };
  },
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

import { holo } from 'jotai-holo';
import { selectView } from '../workbook.js';
import { FormulaView } from './views/formula-views.js';

export const FormulaBar = holo({
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

import { stateAtom } from 'jotai-holo/vanilla';
import { holo } from 'jotai-holo';
import { $$workbook, selectSheet, retry } from '../workbook.js';
import { SheetStatusView } from './views/feedback-views.js';

export const SheetStatus = holo({
  models: { sheet: selectSheet, book: $$workbook },
  view: SheetStatusView,
  read: ({ sheet, book }) => ({
    status: stateAtom((get) => {
      const status = get(book.$statuses)[sheet.sheetId] ?? 'loading';
      return status === 'saved' && get(book.$saving) ? 'saving' : status;
    }),
  }),
  write: { onRetry: retry },
});

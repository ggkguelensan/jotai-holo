import { holo } from 'jotai-holo';
import { retry } from '../workbook.js';
import { SheetStatusView } from './views/feedback-views.js';

export const SheetStatus = holo({
  view: SheetStatusView,
  write: { onRetry: retry },
});

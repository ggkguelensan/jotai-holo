import { actionAtom } from 'jotai-holo/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import * as registry from './models/index.js';
import { createWorkbookModel } from './models/book-model.js';
import type { SheetKey, ViewKey } from './models/types.js';
import { connectWorkbook, retryWorkbook } from './persistence/book.js';
import { connectSheet, retrySheet } from './persistence/sheet.js';
import { connectView } from './persistence/view.js';
import seed from './gift-budget.json';

export { $storage } from './persistence/config.js';

export const { selectCell } = registry;

export const $$workbook = pipe(
  createWorkbookModel,
  modelConnection(connectWorkbook),
  modelRegistry(),
);

export const $$sheet = pipe(
  registry.$$sheet,
  modelConnection((sheet, context) =>
    connectSheet(sheet, context, context.store.get($$workbook())),
  ),
);

export const selectSheet = ({ sheetId }: SheetKey) =>
  $$sheet({ key: ['sheet', sheetId], initial: { sheetId } });

export const $$view = pipe(
  registry.$$view,
  modelConnection((view, context) =>
    connectView(view, context, context.store.get($$workbook())),
  ),
);

export const selectView = ({ sheetId, viewId = 'main' }: ViewKey) =>
  $$view({ key: ['view', sheetId, viewId], initial: { sheetId, viewId } });

export const retryBook = actionAtom(async (get) => {
  await retryWorkbook(get($$workbook()));
});

export const retry = actionAtom(async (get, _set, sheetId: string) => {
  await retrySheet(get(selectSheet({ sheetId })));
});

export const reset = actionAtom((get, set, sheetId: string) => {
  const sheet = get(selectSheet({ sheetId }));
  set(sheet.load, seed);
  const view = get(selectView({ sheetId }));
  set(view.cancel);
  set(view.select, seed.selected ?? 'A1');
});

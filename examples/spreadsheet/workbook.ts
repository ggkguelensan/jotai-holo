import { actionAtom } from 'jotai-holo/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import * as registry from './models/index.js';
import { createWorkbookModel } from './models/book-model.js';
import type { SheetKey, ViewKey } from './models/types.js';
import { connectWorkbook, retryWorkbook } from './persistence/book.js';
import { connectSheet, retrySheet } from './persistence/sheet.js';
import { connectView } from './persistence/view.js';
import seed from './gift-budget.json';
import { initialDocument } from './datasets.js';

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

// Navigation coordinates models here; the book itself only owns its metadata.
export const switchSheet = actionAtom((get, set, id: string) => {
  const book = get($$workbook());
  if (!get(book.$sheets).some((sheet) => sheet.id === id)) return;
  const current = get(book.$active);
  if (current) set(get(selectView({ sheetId: current })).commit);
  set(book.switchSheet, id);
});

export const addSheet = actionAtom((get, set) => {
  const book = get($$workbook());
  if (!get(book.$ready)) return;
  const current = get(book.$active);
  if (current) set(get(selectView({ sheetId: current })).commit);
  set(book.addSheet);
});

export const retryBook = actionAtom(async (get) => {
  await retryWorkbook(get($$workbook()));
});

export const retry = actionAtom(async (get, _set, sheetId: string) => {
  await retrySheet(get(selectSheet({ sheetId })));
});

export const reset = actionAtom((get, set, sheetId: string) => {
  const sheet = get(selectSheet({ sheetId }));
  const descriptor = get(get($$workbook()).$sheets).find(
    (item) => item.id === sheetId,
  );
  set(sheet.load, initialDocument(descriptor ?? { id: sheetId, title: '' }));
  const view = get(selectView({ sheetId }));
  set(view.cancel);
  set(view.select, sheetId === 'gifts' ? seed.selected : 'A1');
});

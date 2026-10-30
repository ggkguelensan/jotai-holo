import { z } from 'zod';
import type { BookDocument, ViewSnapshot } from '../models/types.js';

const bookSchema = z.object({
  version: z.literal(1),
  sheets: z
    .array(z.object({ id: z.string().min(1), title: z.string() }))
    .min(1),
  activeSheetId: z.string(),
  views: z.record(z.string(), z.unknown()).catch({}),
});
const viewSchema = z.object({
  selected: z.string().regex(/^[A-Z]+[1-9]\d*$/),
  camera: z.object({
    row: z.number().int().nonnegative(),
    column: z.number().int().nonnegative(),
  }),
});

function decode(value: unknown): BookDocument {
  const book = bookSchema.parse(value);
  const ids = new Set(book.sheets.map((sheet) => sheet.id));
  if (ids.size !== book.sheets.length || !ids.has(book.activeSheetId))
    throw new TypeError('Invalid workbook sheet IDs.');

  // Invalid optional UI state must not prevent restoring the workbook.
  const views: Record<string, ViewSnapshot> = {};
  for (const [key, value] of Object.entries(book.views)) {
    const view = viewSchema.safeParse(value);
    if (view.success) views[key] = view.data;
  }
  return { ...book, views };
}

export const bookCodec = {
  decode,
  encode: (document: BookDocument) => document,
};

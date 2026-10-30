import { addressOf, limits } from './coordinates.js';
import type { SheetDocument } from './models/types.js';

/** Bounded RFC-style CSV fields; build a complete document before loading atoms. */
export function parseCsvDocument(source: string): SheetDocument {
  const cells: Record<string, string> = {};
  let row = 0;
  let width = 0;
  let filled = 0;
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let closed = false;
  const text = source.replace(/^\uFEFF/, '');
  const pushField = () => {
    if (field.length > 512) throw new RangeError('CSV cell is too long.');
    fields.push(field);
    field = '';
    closed = false;
  };
  const pushRow = () => {
    pushField();
    if (!width) width = fields.length;
    if (fields.length !== width)
      throw new TypeError('Unequal CSV row lengths.');
    if (row >= limits.rows || width > limits.columns)
      throw new RangeError('CSV exceeds sheet dimensions.');
    fields.forEach((value, column) => {
      if (value !== '') {
        if (++filled > 20_000)
          throw new RangeError('CSV exceeds 20,000 cells.');
        cells[addressOf({ row, column })] = value;
      }
    });
    row++;
    fields = [];
  };
  for (let offset = 0; offset < text.length; offset++) {
    const char = text[offset]!;
    if (quoted) {
      if (char === '"' && text[offset + 1] === '"') {
        field += '"';
        offset++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
    } else if (char === ',') pushField();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[offset + 1] === '\n') offset++;
      if (fields.length || field || closed) pushRow();
    } else if (char === '"' && !field && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new TypeError('Invalid CSV quoting.');
      field += char;
    }
  }
  if (quoted) throw new TypeError('Unterminated CSV field.');
  if (fields.length || field || closed) pushRow();
  if (!row) throw new TypeError('Empty CSV.');
  return { version: 1, rows: row, columns: width, cells };
}

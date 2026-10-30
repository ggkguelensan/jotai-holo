import { createStore } from 'jotai/vanilla';
import { expect, test } from 'vitest';
import { parseCsvDocument } from '../examples/spreadsheet/csv.js';
import {
  appendSampleSheets,
  initialDocument,
  sampleDocument,
} from '../examples/spreadsheet/datasets.js';
import { createSheetModel } from '../examples/spreadsheet/models/sheet-model.js';

test('full CSV samples preserve headers, missing fields, precision and final rows', () => {
  const penguins = sampleDocument('penguins');
  expect([penguins.rows, penguins.columns]).toEqual([345, 8]);
  expect(penguins.cells.A1).toBe('species');
  expect(penguins.cells.H345).toBe('2009');
  const titanic = sampleDocument('titanic');
  expect([titanic.rows, titanic.columns]).toEqual([892, 15]);
  expect(titanic.cells.G3).toBe('71.2833');
  expect(titanic.cells.L2).toBeUndefined();
  expect(titanic.cells.O892).toBe('True');
  expect(sampleDocument('titanic')).toBe(titanic);
});

test('CSV supports BOM, quoted commas, escaped quotes, newlines and empty fields', () => {
  const doc = parseCsvDocument('\uFEFF"a,b",value,empty\r\n"two\nlines",1,\r\n"say ""hi""",2,\r\n');
  expect(doc.cells.A1).toBe('a,b');
  expect(doc.cells.A2).toBe('two\nlines');
  expect(doc.cells.A3).toBe('say "hi"');
  expect(doc.cells.C2).toBeUndefined();
});

test.each([
  '',
  'a,b\n1\n',
  '"unclosed',
  '"closed"suffix',
  'x'.repeat(513),
  'a\n'.repeat(1001),
  Array(1001).fill('x').join(','),
  `${Array(22).fill('x').join(',')}\n`.repeat(1000),
])('invalid or oversized CSV is rejected atomically', (csv) => {
  expect(() => parseCsvDocument(csv)).toThrow();
});

test('sample migration preserves user sheets, ID collisions and renames without duplication', () => {
  const original = [{ id: 'csv-penguins', title: 'My work' }];
  const migrated = appendSampleSheets(original);
  expect(migrated[0]).toBe(original[0]);
  expect(migrated).toHaveLength(3);
  expect(migrated[1]!.id).not.toBe('csv-penguins');
  migrated[1]!.title = 'Renamed';
  expect(appendSampleSheets(migrated)).toEqual(migrated);
});

test('bulk load and reset use the same source without mutating a sample', () => {
  const store = createStore();
  const sheet = createSheetModel({ sheetId: 'csv-penguins' });
  const descriptor = { id: 'csv-penguins', title: 'Penguins', dataset: 'penguins' } as const;
  store.set(sheet.load, initialDocument(descriptor));
  store.set(sheet.setCell, { address: 'C2', value: '55' });
  expect(store.get(sheet.inputAt('C2'))).toBe('55');
  store.set(sheet.load, initialDocument(descriptor));
  expect(store.get(sheet.inputAt('C2'))).toBe('39.1');
  expect(sampleDocument('penguins').cells.C2).toBe('39.1');
});

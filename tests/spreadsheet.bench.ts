import { createStore } from 'jotai/vanilla';
import { bench, describe } from 'vitest';
import { createSheetModel } from '../examples/spreadsheet/models/sheet-model.js';

function scenario(cells: Record<string, string>, outputs: string[]) {
  const store = createStore();
  const sheet = createSheetModel({ sheetId: 'benchmark' });
  store.set(sheet.load, { rows: 1000, columns: 4, cells });
  const atoms = outputs.map((address) => sheet.cellAt(address).$value);
  const read = () => atoms.forEach((value) => store.get(value));
  read();
  let next = 1;
  const edit = () => store.set(sheet.setCell, { address: 'A1', value: String(++next) });
  return { read, edit };
}

const chain = Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => [`A${i + 1}`, i === 0 ? '1' : `=A${i}+1`]),
);
const fanout = {
  A1: '1',
  B1: '=A1*2',
  ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`C${i + 1}`, '=B1+1'])),
};
const range = {
  ...Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`A${i + 1}`, '1'])),
  B1: '=SUM(A1:A1000)',
};

for (const [name, cells, outputs] of [
  ['chain / 100 demanded results', chain, Object.keys(chain)],
  ['fanout / 100 roots sharing B1', fanout, Object.keys(fanout)],
  ['range / 1000 source cells', range, ['B1']],
] as const) {
  describe(name, () => {
    const cached = scenario(cells, [...outputs]);
    const edited = scenario(cells, [...outputs]);
    bench('cached reads', cached.read);
    bench('edit and demanded results (includes validation)', () => {
      edited.edit();
      edited.read();
    });
    // Read an independent value so topology runs without demanding formula values.
    const independent = createStore();
    const sheet = createSheetModel({ sheetId: 'validation' });
    independent.set(sheet.load, { rows: 1000, columns: 4, cells });
    const $value = sheet.cellAt('D1000').$value;
    independent.get($value);
    let next = 1;
    bench('edit and topology validation', () => {
      independent.set(sheet.setCell, { address: 'A1', value: String(++next) });
      independent.get($value);
    });
  });
}

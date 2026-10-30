import { createStore } from 'jotai/vanilla';
import { afterEach, expect, test, vi } from 'vitest';
import * as spreadsheet from '../examples/spreadsheet/models/index.js';
import giftBudget from '../examples/spreadsheet/gift-budget.json';

const releases: (() => void)[] = [];
afterEach(() => {
  for (const release of releases.splice(0)) release();
});

const fixture = (initial?: Record<string, string>) => {
  const registry = spreadsheet;
  const store = createStore();
  const sheetId = 'test';
  const sheetLease = registry.$$sheet.acquire(store, {
    key: ['sheet', sheetId],
    initial: { sheetId },
  });
  releases.push(sheetLease.release);
  const cells = Object.fromEntries(
    Array.from({ length: 8 }, (_, row) =>
      ['A', 'B', 'C', 'D'].map((column) => `${column}${row + 1}`),
    )
      .flat()
      .map((address) => {
        const lease = registry.$$cell.acquire(store, {
          key: ['cell', sheetId, address],
          initial: { sheetId, address },
        });
        releases.push(lease.release);
        return [address, lease.model];
      }),
  );
  const sheet = { ...sheetLease.model, cells };
  store.set(sheet.load, {
    rows: 8,
    columns: 4,
    cells: initial ?? giftBudget.cells,
  });
  const view = store.get(registry.selectView({ sheetId }));
  store.set(view.select, giftBudget.selected);
  return {
    view,
    registry,
    sheet,
    store,
    read: (id: string) => store.get(sheet.cells[id]!.$value),
    write: (id: string, input: string) => store.set(sheet.cells[id]!.$input, input),
  };
};

test('gift budget includes independent game line items and a demo 10% tax', () => {
  const f = fixture();
  expect(f.read('D1')).toBe(960);
  expect(f.read('D2')).toBe(2280);
  expect(f.read('D3')).toBe(520);
  expect(f.read('C4')).toBe(3760);
  expect(f.read('D4')).toBe(376);
  expect(f.read('D5')).toBe(4136);
  f.write('B1', '20');
  expect(f.read('D1')).toBe(1600);
  expect(f.read('D5')).toBe(4840);
});

test.each([
  ['=2+3*4', 14],
  ['=(2+3)*4', 20],
  ['=-2*-3', 6],
  ['=SUM(A1:B2, 4, 2*3)', 20],
  ['=sum(b2:a1)', 10],
  ['=A8+1', 1],
  ['=1e2+.5', 100.5],
  ['=SUM()', 0],
  ['=E1', '#REF!'],
  ['=A0', '#REF!'],
  ['=A9', '#REF!'],
  ['=SUM(A1:E2)', '#REF!'],
  ['=1/0', '#DIV/0!'],
  ['=A3+1', '#VALUE!'],
  ['=A1:A2', '#VALUE!'],
  ['=SUM(A3)', 0],
  ['=1e308*10', '#NUM!'],
  ['=', '#FORMULA!'],
  ['=SUM(A1,)', '#FORMULA!'],
  ['=Math.random()', '#FORMULA!'],
  ['=1;alert(1)', '#FORMULA!'],
])('formula %s evaluates to %s', (input, expected) => {
  const f = fixture({ A1: '1', B1: '2', A2: '3', B2: '4', A3: 'text', C1: input });
  expect(f.read('C1')).toBe(expected);
});

test('self and indirect cycles propagate and recover after a reference is repaired', () => {
  const f = fixture({ A1: '=B1', B1: '=C1', C1: '=A1', D1: '=SUM(A1:C1)' });
  expect(f.read('A1')).toBe('#CYCLE!');
  expect(f.read('D1')).toBe('#CYCLE!');
  f.write('C1', '7');
  expect(f.read('A1')).toBe(7);
  expect(f.read('D1')).toBe(21);
  f.write('C1', '=C1');
  expect(f.read('D1')).toBe('#CYCLE!');
});

test('formula changes replace dependencies; unrelated and unread results stay lazy', () => {
  const f = fixture();
  const unchanged = vi.spyOn(f.sheet.cells.D2!.$value, 'read');
  const unused = vi.spyOn(f.sheet.cells.A8!.$value, 'read');
  const first = vi.fn();
  const second = vi.fn();
  const stopFirst = f.store.sub(f.sheet.cells.D1!.$value, first);
  const stopSecond = f.store.sub(f.sheet.cells.D2!.$value, second);
  unchanged.mockClear();
  f.write('B1', '20');
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled();
  expect(unchanged).not.toHaveBeenCalled();
  f.write('D1', '=B2*C2');
  expect(f.read('D1')).toBe(2280);
  first.mockClear();
  f.write('B1', '30');
  expect(first).not.toHaveBeenCalled();
  f.write('B2', '10');
  expect(f.read('D1')).toBe(950);
  expect(first).toHaveBeenCalledTimes(1);
  expect(unused).not.toHaveBeenCalled();
  stopFirst();
  stopSecond();
});

test('the formula bar writes the selected native atom and loading restores inputs', () => {
  const f = fixture();
  f.store.set(f.view.$selected, 'D1');
  expect(f.store.get(f.view.$formula)).toBe('=B1*C1');
  f.store.set(f.view.begin, '=B1*C1*2');
  f.store.set(f.view.commit);
  expect(f.read('D1')).toBe(1920);
  f.store.set(f.sheet.load, giftBudget);
  expect(f.read('D1')).toBe(960);
  expect(f.store.get(f.view.$selected)).toBe('D1');
});

test('module definitions isolate cell values in separate stores', () => {
  const f = fixture();
  const other = createStore();
  f.write('B1', '30');
  const otherCell = other.get(f.registry.selectCell({ sheetId: 'test', address: 'B1' }));
  expect(other.get(otherCell.$value)).toBe('');
});

test('cell keys share one record and isolate other addresses and sheet IDs', () => {
  const f = fixture();
  const select = (sheetId: string, address: string) =>
    f.store.get(f.registry.selectCell({ sheetId, address }));
  expect(select('test', 'B1')).toBe(f.sheet.cells.B1);
  expect(select('test', 'B1')).toBe(select('test', 'B1'));
  f.write('B1', '30');
  expect(f.store.get(select('test', 'B1').$value)).toBe(30);
  expect(f.store.get(select('other', 'B1').$value)).toBe('');
  expect(f.store.get(select('test', 'B2').$value)).toBe(24);
  expect(f.store.get(select('other', 'D1').$value)).toBe('');
  f.store.set(f.view.$selected, 'B1');
  const otherView = f.store.get(f.registry.selectView({ sheetId: 'other' }));
  expect(f.store.get(otherView.$selected)).toBe('A1');
});

test('a new model is empty and cells created after loading read the document', () => {
  const registry = spreadsheet;
  const store = createStore();
  const sheet = store.get(registry.selectSheet({ sheetId: 'empty' }));
  const view = store.get(registry.selectView({ sheetId: 'empty' }));
  expect(store.get(view.$selected)).toBe('A1');
  expect(store.get(view.$formula)).toBe('');
  store.set(sheet.load, giftBudget);
  const cell = store.get(registry.selectCell({ sheetId: 'empty', address: 'D1' }));
  expect(store.get(cell.$value)).toBe(960);
  expect(store.get(view.$selected)).toBe('A1');
});

test('loading replaces edits in existing models and owns a copy of document data', () => {
  const f = fixture();
  f.write('B1', '30');
  const input = f.sheet.cells.B1!.$input;
  const cells = { A1: '2', B1: '=A1*3' };
  f.store.set(f.sheet.load, { cells });
  cells.A1 = '99';
  expect(f.read('A1')).toBe(2);
  expect(f.read('B1')).toBe(6);
  expect(f.read('D1')).toBe('');
  expect(f.store.get(f.registry.selectCell({ sheetId: 'test', address: 'B1' })).$input).toBe(input);
  f.store.set(f.sheet.clear);
  expect(f.read('A1')).toBe('');
  expect(f.read('B1')).toBe('');
});

test('an invalid document leaves cell data and selection unchanged', () => {
  const f = fixture();
  expect(() =>
    f.store.set(f.sheet.load, {
      cells: { A1: 'changed', INVALID: 'outside' },
    }),
  ).toThrow(RangeError);
  expect(f.read('A1')).toBe(giftBudget.cells.A1);
  expect(f.store.get(f.view.$selected)).toBe(giftBudget.selected);
  expect(() =>
    f.store.set(f.sheet.load, {
      cells: {},
      rows: 0,
    }),
  ).toThrow(RangeError);
  expect(f.read('D1')).toBe(960);
});

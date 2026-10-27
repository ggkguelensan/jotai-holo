import { createStore } from 'jotai/vanilla';
import { expect, test, vi } from 'vitest';
import { createSpreadsheet } from '../examples/spreadsheet/model.js';

const fixture = (initial?: Record<string, string>) => {
  const sheet = createSpreadsheet(initial);
  const store = createStore();
  return {
    sheet,
    store,
    read: (id: string) => store.get(sheet.cells[id]!.$value),
    write: (id: string, input: string) => store.set(sheet.cells[id]!.$input, input),
  };
};

test('project estimate includes independent line items and a 10% reserve', () => {
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
  ['='.repeat(600), '#FORMULA!'],
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

test('the formula bar writes the selected native atom and reset restores inputs', () => {
  const f = fixture();
  f.store.set(f.sheet.$selected, 'D1');
  expect(f.store.get(f.sheet.$formula)).toBe('=B1*C1');
  f.store.set(f.sheet.$formula, '=B1*C1*2');
  expect(f.read('D1')).toBe(1920);
  f.store.set(f.sheet.reset);
  expect(f.read('D1')).toBe(960);
  expect(f.store.get(f.sheet.$selected)).toBe('D5');
});

test('separate stores and separate models are isolated', () => {
  const f = fixture();
  const other = createStore();
  f.write('B1', '30');
  expect(other.get(f.sheet.cells.B1!.$value)).toBe(12);
  const second = createSpreadsheet();
  expect(f.store.get(second.cells.B1!.$value)).toBe(12);
});

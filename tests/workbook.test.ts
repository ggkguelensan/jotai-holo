import { createStore } from 'jotai/vanilla';
import { afterEach, expect, test, vi } from 'vitest';
import { createWorkbook } from '../examples/spreadsheet/workbook.js';
import { createSpreadsheet } from '../examples/spreadsheet/model.js';
import { addressOf, columnName, point, reveal } from '../examples/spreadsheet/coordinates.js';
import giftBudget from '../examples/spreadsheet/gift-budget.json';
import type { DocumentStorage } from '../examples/spreadsheet/storage.js';

const releases: (() => void)[] = [];
afterEach(() => {
  releases
    .splice(0)
    .reverse()
    .forEach((release) => release());
  vi.useRealTimers();
});
const drain = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
function memoryStorage() {
  const values = new Map<string, unknown>();
  let fail = false;
  const storage: DocumentStorage = {
    read: async (key) => structuredClone(values.get(key)),
    write: vi.fn(async (key, value) => {
      if (fail) throw new Error('Storage unavailable');
      values.set(key, structuredClone(value));
    }),
  };
  return {
    values,
    storage,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}
async function fixture(storage = memoryStorage().storage) {
  const workbook = createWorkbook(storage, giftBudget, 'test-book');
  const store = createStore();
  const book = workbook.$$workbook.acquire(store);
  releases.push(book.release);
  await drain();
  const options = { key: ['sheet', 'gifts'], initial: { sheetId: 'gifts' } };
  const sheet = workbook.$$sheet.acquire(store, options);
  releases.push(sheet.release);
  await drain();
  return { workbook, store, book: book.model, sheet, options };
}

test('coordinates span multiple letters and reveal only moves at a window edge', () => {
  expect(columnName(26)).toBe('AA');
  expect(addressOf(point('ALL1000'))).toBe('ALL1000');
  expect(() => point('A0')).toThrow();
  expect(
    reveal({ row: 0, column: 0 }, point('D5'), { rows: 8, columns: 4 }, { rows: 100, columns: 40 }),
  ).toEqual({ row: 0, column: 0 });
  expect(
    reveal({ row: 0, column: 0 }, point('E9'), { rows: 8, columns: 4 }, { rows: 100, columns: 40 }),
  ).toEqual({ row: 1, column: 1 });
});

test('document data survives cell disposal and dimensions hide rather than delete values', async () => {
  const registry = createSpreadsheet();
  const store = createStore();
  const sheet = registry.$$sheet.acquire(store, {
    key: ['sheet', 'one'],
    initial: { sheetId: 'one' },
  });
  releases.push(sheet.release);
  store.set(sheet.model.load, { rows: 100, columns: 40, cells: { AA90: '7', A1: '=AA90*2' } });
  const options = { key: ['cell', 'one', 'AA90'], initial: { sheetId: 'one', address: 'AA90' } };
  const cell = registry.$$cell.acquire(store, options);
  store.set(cell.model.$input, '9');
  cell.release();
  await new Promise((resolve) => setTimeout(resolve, 1));
  const next = registry.$$cell.acquire(store, options);
  releases.push(next.release);
  expect(next.model).not.toBe(cell.model);
  expect(store.get(next.model.$input)).toBe('9');
  const total = store.get(registry.selectCell({ sheetId: 'one', address: 'A1' }));
  expect(store.get(total.$value)).toBe(18);
  store.set(sheet.model.resize, { rows: 8, columns: 4 });
  expect(store.get(total.$value)).toBe('#REF!');
  store.set(sheet.model.resize, { rows: 100, columns: 40 });
  expect(store.get(total.$value)).toBe(18);
});

test('editing has cancel/commit and tab wraps logical rows while camera reveals selection', () => {
  const registry = createSpreadsheet();
  const store = createStore();
  const sheet = store.get(registry.selectSheet({ sheetId: 'edit' }));
  store.set(sheet.load, { rows: 20, columns: 10, cells: { D5: '7' } });
  const view = store.get(registry.selectView({ sheetId: 'edit' }));
  store.set(view.select, 'D5');
  store.set(view.begin);
  store.set(view.$draft, '9');
  store.set(view.cancel);
  expect(store.get(sheet.inputAt('D5'))).toBe('7');
  store.set(view.begin, '10');
  store.set(view.move, { row: 0, column: 1 });
  expect(store.get(sheet.inputAt('D5'))).toBe('10');
  expect(store.get(view.$selected)).toBe('E5');
  expect(store.get(view.$camera)).toEqual({ row: 0, column: 1 });
  store.set(view.select, 'J5');
  expect(store.set(view.tab, false)).toBe(true);
  expect(store.get(view.$selected)).toBe('A6');
  store.set(view.select, 'J20');
  expect(store.set(view.tab, false)).toBe(false);
});

test('saved sheet returns the same model before a minute and a new restored model afterwards', async () => {
  vi.useFakeTimers();
  const memory = memoryStorage();
  const f = await fixture(memory.storage);
  f.store.set(f.sheet.model.setCell, { address: 'B1', value: '20' });
  f.sheet.release();
  await drain();
  expect(memory.values.get('test-book/sheet/gifts')).toMatchObject({ cells: { B1: '20' } });
  await vi.advanceTimersByTimeAsync(59_000);
  const retained = f.workbook.$$sheet.acquire(f.store, f.options);
  expect(retained.model).toBe(f.sheet.model);
  retained.release();
  await drain();
  await vi.advanceTimersByTimeAsync(60_001);
  const restored = f.workbook.$$sheet.acquire(f.store, f.options);
  releases.push(restored.release);
  expect(restored.model).not.toBe(f.sheet.model);
  await drain();
  expect(f.store.get(restored.model.inputAt('B1'))).toBe('20');
});

test('failed persistence pins the dirty model beyond retention; retry saves and permits eviction', async () => {
  vi.useFakeTimers();
  const memory = memoryStorage();
  const f = await fixture(memory.storage);
  memory.fail(true);
  f.store.set(f.sheet.model.setCell, { address: 'B1', value: '99' });
  f.sheet.release();
  await drain();
  await vi.advanceTimersByTimeAsync(120_000);
  const retained = f.workbook.$$sheet.acquire(f.store, f.options);
  expect(retained.model).toBe(f.sheet.model);
  expect(f.store.get(retained.model.inputAt('B1'))).toBe('99');
  expect(f.store.get(f.book.$statuses).gifts).toBe('error');
  memory.fail(false);
  await f.store.set(f.workbook.retry, 'gifts');
  retained.release();
  await drain();
  await vi.advanceTimersByTimeAsync(60_001);
  const restored = f.workbook.$$sheet.acquire(f.store, f.options);
  releases.push(restored.release);
  expect(restored.model).not.toBe(f.sheet.model);
  await drain();
  expect(f.store.get(restored.model.inputAt('B1'))).toBe('99');
});

test('returning during a delayed write prevents eviction and newer edits get a later write', async () => {
  vi.useFakeTimers();
  const memory = memoryStorage();
  const f = await fixture(memory.storage);
  const waiting: (() => void)[] = [];
  const write = vi
    .spyOn(memory.storage, 'write')
    .mockClear()
    .mockImplementation(async (key, value) => {
      await new Promise<void>((resolve) => waiting.push(resolve));
      memory.values.set(key, structuredClone(value));
    });
  f.store.set(f.sheet.model.setCell, { address: 'B1', value: '30' });
  f.sheet.release();
  await drain();
  await vi.advanceTimersByTimeAsync(90_000);
  const returned = f.workbook.$$sheet.acquire(f.store, f.options);
  releases.push(returned.release);
  expect(returned.model).toBe(f.sheet.model);
  f.store.set(returned.model.setCell, { address: 'B1', value: '40' });
  waiting.shift()!();
  await drain();
  waiting.shift()!();
  await drain();
  expect(memory.values.get('test-book/sheet/gifts')).toMatchObject({ cells: { B1: '40' } });
  expect(f.store.get(f.book.$statuses).gifts).toBe('saved');
  expect(write).toHaveBeenCalledTimes(2);
});

test('a fresh instance is not editable before a delayed restore and invalid optional camera is ignored', async () => {
  vi.useFakeTimers();
  const memory = memoryStorage();
  const f = await fixture(memory.storage);
  f.store.set(f.sheet.model.setCell, { address: 'AA90', value: '7' });
  f.sheet.release();
  await drain();
  await vi.advanceTimersByTimeAsync(60_001);
  let resolve!: (value: unknown) => void;
  vi.spyOn(memory.storage, 'read').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const opened = f.workbook.$$sheet.acquire(f.store, f.options);
  releases.push(opened.release);
  expect(opened.model).not.toBe(f.sheet.model);
  expect(f.store.get(opened.model.$loaded)).toBe(false);
  resolve(memory.values.get('test-book/sheet/gifts'));
  await drain();
  expect(f.store.get(opened.model.$loaded)).toBe(true);
  expect(f.store.get(opened.model.inputAt('AA90'))).toBe('7');
  f.store.set(f.book.$views, {
    'gifts/main': { selected: 'AA90', camera: { row: NaN, column: 0 } },
  });
  const view = f.workbook.$$view.acquire(f.store, {
    key: ['view', 'gifts', 'main'],
    initial: { sheetId: 'gifts', viewId: 'main' },
  });
  releases.push(view.release);
  expect(Number.isFinite(f.store.get(view.model.$camera).row)).toBe(true);
});

test('oversized formula ranges return a bounded error without creating their cells', () => {
  const registry = createSpreadsheet();
  const store = createStore();
  const sheet = store.get(registry.selectSheet({ sheetId: 'large' }));
  store.set(sheet.load, { rows: 1000, columns: 1000, cells: { A1: '=SUM(A1:ALL1000)' } });
  const inputAt = vi.spyOn(sheet, 'inputAt');
  const cell = store.get(registry.selectCell({ sheetId: 'large', address: 'A1' }));
  expect(store.get(cell.$value)).toBe('#LIMIT!');
  expect(inputAt.mock.calls.length).toBeLessThan(10);
});

test('another visible owner prevents the inactive-sheet retention timer from starting', async () => {
  vi.useFakeTimers();
  const f = await fixture();
  const second = f.workbook.$$sheet.acquire(f.store, f.options);
  f.sheet.release();
  await drain();
  await vi.advanceTimersByTimeAsync(120_000);
  const third = f.workbook.$$sheet.acquire(f.store, f.options);
  expect(third.model).toBe(second.model);
  third.release();
  second.release();
  await drain();
  await vi.advanceTimersByTimeAsync(60_001);
  const next = f.workbook.$$sheet.acquire(f.store, f.options);
  releases.push(next.release);
  expect(next.model).not.toBe(second.model);
});

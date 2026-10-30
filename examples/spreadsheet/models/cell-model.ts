import { atom } from 'jotai/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import { evaluateCell, parseCell, type CellValue } from '../formulas.js';
import { columnName, contains, point } from '../coordinates.js';
import { $$sheet, selectSheet } from './sheet-model.js';
import type { CellKey } from './types.js';

// #region cell-model
export function createCellModel({ sheetId, address }: CellKey) {
  const $input = atom(
    (get): string => get(get(selectSheet({ sheetId })).inputAt(address)),
    (get, set, value: string) =>
      set(get(selectSheet({ sheetId })).setCell, { address, value }),
  );
  const $expression = atom((get) => parseCell(get($input)));
  const $value = atom((get): CellValue => {
    const sheet = get(selectSheet({ sheetId }));
    const size = get(sheet.$dimensions);
    if (!contains(size, point(address))) return '#REF!';
    return evaluateCell(
      address,
      (ref) => {
        try {
          if (!contains(size, point(ref)))
            return { kind: 'literal', value: '#REF!' };
          return get(get(selectCell({ sheetId, address: ref })).$expression);
        } catch (error) {
          if (error instanceof RangeError)
            return { kind: 'literal', value: '#REF!' };
          throw error;
        }
      },
      Array.from({ length: size.columns }, (_, i) => columnName(i)),
      size.rows,
    );
  });
  return { address, $input, $expression, $value };
}
// #endregion cell-model

export const $$cell = pipe(
  createCellModel,
  modelConnection(
    (_cell, { initial, store }) =>
      $$sheet.acquire(store, {
        key: ['sheet', initial.sheetId],
        initial: { sheetId: initial.sheetId },
      }).release,
  ),
  modelRegistry({ retainTime: 0 }),
);

export function selectCell({ sheetId, address }: CellKey) {
  return $$cell({
    key: ['cell', sheetId, address],
    initial: { sheetId, address },
  });
}

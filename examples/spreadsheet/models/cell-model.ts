import { atom } from 'jotai/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import { $$sheet, selectSheet } from './sheet-model.js';
import type { CellKey } from './types.js';

// #region cell-model
export function createCellModel({ sheetId, address }: CellKey) {
  const $input = atom(
    (get): string => get(get(selectSheet({ sheetId })).inputAt(address)),
    (get, set, value: string) =>
      set(get(selectSheet({ sheetId })).setCell, { address, value }),
  );
  const $expression = atom((get) =>
    get(get(selectSheet({ sheetId })).cellAt(address).$expression),
  );
  const $value = atom((get) =>
    get(get(selectSheet({ sheetId })).cellAt(address).$value),
  );
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

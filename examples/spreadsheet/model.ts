import { atom } from 'jotai/vanilla';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { evaluateCell, parseCell, type CellValue } from './formulas.js';

export const columns = ['A', 'B', 'C', 'D'] as const;
export const rowCount = 8;
export const initialBudget: Record<string, string> = {
  A1: 'Deep Orbit',
  B1: '12',
  C1: '80',
  D1: '=B1*C1',
  A2: 'Neon Tactics',
  B2: '24',
  C2: '95',
  D2: '=B2*C2',
  A3: 'Wild Circuit',
  B3: '8',
  C3: '65',
  D3: '=B3*C3',
  A4: '10%',
  B4: '0.1',
  C4: '=SUM(D1:D3)',
  D4: '=B4*C4',
  A5: 'Σ',
  D5: '=SUM(D1:D4)',
};

// #region sheet-model
export function createSpreadsheet(initial = initialBudget) {
  const addresses = Array.from({ length: rowCount }, (_, row) =>
    columns.map((column) => `${column}${row + 1}`),
  ).flat();
  const $columns = atom(() => columns);
  const $rows = atom(() =>
    Array.from({ length: rowCount }, (_, index) => index + 1),
  );

  function createCellModel({ sheetId, address }: CellKey) {
    const $input = stateAtom(initial[address] ?? '');
    const $expression = stateAtom((get) => parseCell(get($input)));
    const $value = stateAtom(
      (get): CellValue =>
        evaluateCell(
          address,
          (ref) => {
            if (!addresses.includes(ref))
              return { kind: 'literal', value: '#REF!' };
            const cell = get(selectCell({ sheetId, address: ref }));
            return get(cell.$expression);
          },
          columns,
          rowCount,
        ),
    );
    return { $input, $expression, $value };
  }

  const $$cell = pipe(createCellModel, modelRegistry());

  function selectCell({ sheetId, address }: CellKey) {
    return $$cell({
      key: ['cell', sheetId, address],
      initial: { sheetId, address },
    });
  }

  function createSheetModel({ sheetId }: SheetKey) {
    const $selected = stateAtom('D5');
    const $formula = atom(
      (get) =>
        get(get(selectCell({ sheetId, address: get($selected) })).$input),
      (get, set, value: string) => {
        const cell = get(selectCell({ sheetId, address: get($selected) }));
        set(cell.$input, value);
      },
    );
    const reset = actionAtom((get, set) => {
      for (const address of addresses) {
        const cell = get(selectCell({ sheetId, address }));
        set(cell.$input, initial[address] ?? '');
      }
      set($selected, 'D5');
    });
    return { $selected, $formula, reset };
  }

  const $$sheet = pipe(createSheetModel, modelRegistry());

  function selectSheet({ sheetId }: SheetKey) {
    return $$sheet({ key: ['sheet', sheetId], initial: { sheetId } });
  }

  return {
    $$sheet,
    $$cell,
    selectSheet,
    selectCell,
    $rows,
    $columns,
    addresses,
  };
}
// #endregion sheet-model

export type SheetKey = { sheetId: string };
export type CellKey = SheetKey & { address: string };

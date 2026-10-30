import { atom } from 'jotai/vanilla';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { evaluateCell, parseCell, type CellValue } from './formulas.js';

export const columns = ['A', 'B', 'C', 'D'] as const;
export const rowCount = 8;
// #region sheet-model
export type SheetKey = { sheetId: string };
export type CellKey = SheetKey & { address: string };

export type SheetDocument = {
  cells: Readonly<Record<string, string>>;
  selected?: string;
};

export function createSpreadsheet() {
  const addresses = Array.from({ length: rowCount }, (_, row) =>
    columns.map((column) => `${column}${row + 1}`),
  ).flat();
  const $columns = atom(() => columns);
  const $rows = atom(() =>
    Array.from({ length: rowCount }, (_, index) => index + 1),
  );

  function createCellModel({ sheetId, address }: CellKey) {
    const $edit = stateAtom<{ version: number; value: string } | null>(null);
    const $input = stateAtom(
      (get): string => {
        const sheet = get(selectSheet({ sheetId }));
        const document = get(sheet.$document);
        const edit = get($edit);
        return edit?.version === document.version
          ? edit.value
          : (document.cells[address] ?? '');
      },
      (get, set, value: string) => {
        const sheet = get(selectSheet({ sheetId }));
        set($edit, { version: get(sheet.$document).version, value });
      },
    );
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
    const firstAddress = addresses[0]!;
    const $selected = stateAtom(firstAddress);
    const $document = stateAtom<{
      version: number;
      cells: Readonly<Record<string, string>>;
    }>({ version: 0, cells: {} });
    const $formula = atom(
      (get): string =>
        get(get(selectCell({ sheetId, address: get($selected) })).$input),
      (get, set, value: string) => {
        const cell = get(selectCell({ sheetId, address: get($selected) }));
        set(cell.$input, value);
      },
    );
    const load = actionAtom((get, set, document: SheetDocument) => {
      const selected = document.selected ?? firstAddress;
      if (!addresses.includes(selected))
        throw new RangeError(`Invalid selected address: ${selected}`);
      const cells = { ...document.cells };
      for (const [address, input] of Object.entries(cells)) {
        if (!addresses.includes(address))
          throw new RangeError(`Invalid cell address: ${address}`);
        if (typeof input !== 'string')
          throw new TypeError(`Cell input must be a string: ${address}`);
      }
      // A new version replaces edits without enumerating registered cells.
      set($document, {
        version: get($document).version + 1,
        cells: Object.freeze(cells),
      });
      set($selected, selected);
    });
    const clear = actionAtom((_get, set) => set(load, { cells: {} }));
    return { $document, $selected, $formula, load, clear };
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

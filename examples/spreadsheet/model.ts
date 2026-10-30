import { atom } from 'jotai/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { evaluateCell, parseCell, type CellValue } from './formulas.js';
import {
  addressOf,
  clampPoint,
  columnName,
  contains,
  point,
  reveal,
  validateDimensions,
  type Dimensions,
  type Point,
} from './coordinates.js';

const defaultSize = { rows: 8, columns: 4 };
export type SheetKey = { sheetId: string };
export type CellKey = SheetKey & { address: string };
export type ViewKey = SheetKey & { viewId?: string | undefined };
export type SheetDocument = {
  version?: number;
  rows?: number;
  columns?: number;
  cells: Readonly<Record<string, string>>;
};

export function createSpreadsheet() {
  function createSheetModel(_initial: SheetKey) {
    const inputs = new Map<string, ReturnType<typeof stateAtom<string>>>();
    const $dimensions = stateAtom<Dimensions>({
      rows: defaultSize.rows,
      columns: defaultSize.columns,
    });
    const $revision = stateAtom(0);
    const $loaded = stateAtom(false);
    // These atoms belong to the document, not to visible cell models.
    function inputAt(address: string) {
      point(address);
      let input = inputs.get(address);
      if (!input) inputs.set(address, (input = stateAtom('')));
      return input;
    }
    const $document = atom((get): SheetDocument => {
      get($revision);
      const cells: Record<string, string> = {};
      for (const [address, input] of inputs) {
        const value = get(input);
        if (value !== '') cells[address] = value;
      }
      return { version: 1, ...get($dimensions), cells };
    });
    const setCell = actionAtom(
      (_get, set, { address, value }: { address: string; value: string }) => {
        if (value.length > 512) throw new RangeError('Cell input is too long.');
        set(inputAt(address), value);
        set($revision, (n) => n + 1);
      },
    );
    const resize = actionAtom((_get, set, size: Dimensions) => {
      validateDimensions(size);
      set($dimensions, { ...size });
      set($revision, (n) => n + 1);
    });
    const load = actionAtom((_get, set, document: SheetDocument) => {
      const size = {
        rows: document.rows ?? defaultSize.rows,
        columns: document.columns ?? defaultSize.columns,
      };
      validateDimensions(size);
      if (document.version !== undefined && document.version !== 1)
        throw new TypeError('Unsupported document version.');
      if (
        !document.cells ||
        typeof document.cells !== 'object' ||
        Array.isArray(document.cells)
      )
        throw new TypeError('Invalid cells.');
      const cells = { ...document.cells };
      for (const [address, value] of Object.entries(cells)) {
        point(address);
        if (typeof value !== 'string' || value.length > 512)
          throw new TypeError(`Invalid cell input: ${address}`);
      }
      for (const address of new Set([...inputs.keys(), ...Object.keys(cells)]))
        set(inputAt(address), cells[address] ?? '');
      set($dimensions, size);
      set($revision, (n) => n + 1);
      set($loaded, true);
    });
    const clear = actionAtom((get, set) =>
      set(load, { ...get($dimensions), cells: {} }),
    );
    return {
      sheetId: _initial.sheetId,
      inputAt,
      $document,
      $dimensions,
      $loaded,
      $revision,
      setCell,
      resize,
      load,
      clear,
    };
  }
  // #region sheet-model
  const $$sheet = pipe(createSheetModel, modelRegistry({ retainTime: 60_000 }));
  const selectSheet = ({ sheetId }: SheetKey) =>
    $$sheet({ key: ['sheet', sheetId], initial: { sheetId } });

  // #endregion sheet-model

  // #region cell-model
  function createCellModel({ sheetId, address }: CellKey) {
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

  const $$cell = pipe(
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
  function selectCell({ sheetId, address }: CellKey) {
    return $$cell({
      key: ['cell', sheetId, address],
      initial: { sheetId, address },
    });
  }

  function createViewModel({ sheetId }: ViewKey) {
    const sheet = selectSheet({ sheetId });
    const $selected = stateAtom('A1');
    const $camera = stateAtom<Point>({ row: 0, column: 0 });
    const $window = stateAtom<Dimensions>({ rows: 8, columns: 4 });
    const $editing = stateAtom(false);
    const $focus = stateAtom(0);
    const $draft = stateAtom('');
    const $size = atom((get) => get(get(sheet).$dimensions));
    const commit = actionAtom((get, set) => {
      if (!get($editing)) return;
      set(get(sheet).setCell, { address: get($selected), value: get($draft) });
      set($editing, false);
    });
    const select = actionAtom((get, set, address: string) => {
      const p = point(address);
      if (!contains(get($size), p))
        throw new RangeError('Address is outside the sheet.');
      set(commit);
      set($selected, address);
      set($camera, reveal(get($camera), p, get($window), get($size)));
    });
    const begin = actionAtom((get, set, replace?: string) => {
      set($draft, replace ?? get(get(sheet).inputAt(get($selected))));
      set($editing, true);
    });
    const cancel = actionAtom((_get, set) => set($editing, false));
    const move = actionAtom((get, set, delta: Point) => {
      const current = point(get($selected));
      set(
        select,
        addressOf(
          clampPoint(
            {
              row: current.row + delta.row,
              column: current.column + delta.column,
            },
            get($size),
          ),
        ),
      );
      set($focus, (n) => n + 1);
    });
    const tab = actionAtom((get, set, backward: boolean) => {
      set(commit);
      const current = point(get($selected));
      const size = get($size);
      const next =
        current.row * size.columns + current.column + (backward ? -1 : 1);
      if (next < 0 || next >= size.rows * size.columns) return false;
      set(
        select,
        addressOf({
          row: Math.floor(next / size.columns),
          column: next % size.columns,
        }),
      );
      set($focus, (n) => n + 1);
      return true;
    });
    const adjust = actionAtom((get, set) => {
      set(commit);
      const p = clampPoint(point(get($selected)), get($size));
      set($selected, addressOf(p));
      set($camera, reveal(get($camera), p, get($window), get($size)));
    });
    const setWindow = actionAtom((get, set, window: Dimensions) => {
      const current = get($window);
      if (current.rows === window.rows && current.columns === window.columns)
        return;
      set($window, window);
      set(adjust);
    });
    const $formula = atom((get) =>
      get($editing) ? get($draft) : get(get(sheet).inputAt(get($selected))),
    );
    return {
      $selected,
      $camera,
      $window,
      $focus,
      $editing,
      $draft,
      $formula,
      $size,
      select,
      begin,
      commit,
      cancel,
      move,
      tab,
      adjust,
      setWindow,
    };
  }
  const $$view = pipe(
    createViewModel,
    modelConnection((view, { store }) => {
      const stop = store.sub(view.$size, () => store.set(view.adjust));
      store.set(view.adjust);
      return stop;
    }),
    modelRegistry({ retainTime: 0 }),
  );
  const selectView = ({ sheetId, viewId = 'main' }: ViewKey) =>
    $$view({ key: ['view', sheetId, viewId], initial: { sheetId, viewId } });
  return { $$sheet, $$cell, $$view, selectSheet, selectCell, selectView };
}
export type Spreadsheet = ReturnType<typeof createSpreadsheet>;
export type SheetModel = ReturnType<Spreadsheet['$$sheet']['acquire']>['model'];

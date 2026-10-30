import { atom, type WritableAtom } from 'jotai/vanilla';
import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { point, validateDimensions, type Dimensions } from '../coordinates.js';
import { createCellGraph } from './cell-graph.js';
import type { SheetKey, SheetDocument } from './types.js';

const defaultSize = { rows: 8, columns: 4 };

export function createSheetModel(_initial: SheetKey) {
  const $dimensions = stateAtom<Dimensions>({
    rows: defaultSize.rows,
    columns: defaultSize.columns,
  });
  const $revision = stateAtom(0);
  const $loaded = stateAtom(false);
  const graph = createCellGraph($dimensions, $revision);
  const { inputs } = graph;
  const publicInputs = new Map<string, WritableAtom<string, [string], void>>();
  function inputAt(address: string) {
    point(address);
    let input = publicInputs.get(address);
    if (!input) {
      const source = graph.inputAt(address);
      input = atom(
        (get) => get(source),
        (_get, set, value: string) => set(setCell, { address, value }),
      );
      publicInputs.set(address, input);
    }
    return input;
  }
  function cellAt(address: string) {
    point(address);
    return graph.cellAt(address);
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
    (get, set, { address, value }: { address: string; value: string }) => {
      point(address);
      if (value.length > 512) throw new RangeError('Cell input is too long.');
      if (get(graph.inputAt(address)) === value) return;
      set(graph.inputAt(address), value);
      set($revision, (n) => n + 1);
    },
  );
  const resize = actionAtom((get, set, size: Dimensions) => {
    validateDimensions(size);
    const current = get($dimensions);
    if (current.rows === size.rows && current.columns === size.columns) return;
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
      set(graph.inputAt(address), cells[address] ?? '');
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
    cellAt,
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
export const $$sheet = pipe(
  createSheetModel,
  modelRegistry({ retainTime: 60_000 }),
);
export const selectSheet = ({ sheetId }: SheetKey) =>
  $$sheet({ key: ['sheet', sheetId], initial: { sheetId } });
// #endregion sheet-model

export type SheetModel = ReturnType<typeof createSheetModel>;

import { atom } from 'jotai/vanilla';
import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { point, validateDimensions, type Dimensions } from '../coordinates.js';
import type { SheetKey, SheetDocument } from './types.js';

const defaultSize = { rows: 8, columns: 4 };

export function createSheetModel(_initial: SheetKey) {
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
export const $$sheet = pipe(
  createSheetModel,
  modelRegistry({ retainTime: 60_000 }),
);
export const selectSheet = ({ sheetId }: SheetKey) =>
  $$sheet({ key: ['sheet', sheetId], initial: { sheetId } });
// #endregion sheet-model

export type SheetModel = ReturnType<typeof createSheetModel>;

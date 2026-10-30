import { atom, type Atom } from 'jotai/vanilla';
import { ion, stateAtom } from 'jotai-holo/vanilla';
import type { Dimensions } from '../coordinates.js';
import { parseCell, evaluateCell, type CellValue } from '../formulas.js';
import { FormulaError } from '../formulas/errors.js';
import { checkedPoint, references } from '../formulas/references.js';
import { validateTopology } from '../formulas/topology.js';

/** The sheet owns identities; camera slots and cell registry leases do not. */
export function createCellGraph(
  $dimensions: Atom<Dimensions>,
  $revision: Atom<number>,
) {
  const inputs = new Map<string, ReturnType<typeof stateAtom<string>>>();
  const cells = new Map<string, ReturnType<typeof createCell>>();
  function inputAt(address: string) {
    let input = inputs.get(address);
    if (!input) inputs.set(address, (input = stateAtom('')));
    return input;
  }
  const $topology = atom((get) => {
    get($revision);
    const size = get($dimensions);
    const invalid = new Map<string, string>();
    const errors = validateTopology(inputs.keys(), (address) => {
      try {
        checkedPoint(address, size);
        return references(get(cellAt(address).$expression), size);
      } catch (error) {
        if (!(error instanceof FormulaError)) throw error;
        invalid.set(address, error.message);
        return [];
      }
    });
    return new Map([...errors, ...invalid]);
  });
  // #region cell-computation
  function createCell(address: string) {
    const $input = inputAt(address);
    const $expression = ion($input, parseCell);
    const $error = ion($topology, (errors) => errors.get(address));
    const $value: Atom<CellValue> = atom((get) => {
      const error = get($error);
      if (error) return error;
      const size = get($dimensions);
      try {
        checkedPoint(address, size);
      } catch (error) {
        if (error instanceof FormulaError) return error.message;
        throw error;
      }
      return evaluateCell(
        get($expression),
        (ref) => get(cellAt(ref).$value),
        size,
      );
    });
    return { $expression, $value };
  }
  // #endregion cell-computation
  function cellAt(address: string) {
    let cell = cells.get(address);
    if (!cell) cells.set(address, (cell = createCell(address)));
    return cell;
  }
  return { inputs, inputAt, cellAt };
}

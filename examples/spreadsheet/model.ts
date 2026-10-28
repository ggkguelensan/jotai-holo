import { atom, type Atom, type PrimitiveAtom } from 'jotai/vanilla';
import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { evaluateCell, parseCell, type CellValue } from './formulas.js';

export const columns = ['A', 'B', 'C', 'D'] as const;
export const rowCount = 8;
export const initialBudget: Record<string, string> = {
  A1: 'UX',
  B1: '12',
  C1: '80',
  D1: '=B1*C1',
  A2: 'React',
  B2: '24',
  C2: '95',
  D2: '=B2*C2',
  A3: 'QA',
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
  const inputs: Record<string, PrimitiveAtom<string>> = {};
  for (const id of addresses) inputs[id] = stateAtom(initial[id] ?? '');

  const expressions: Record<string, Atom<ReturnType<typeof parseCell>>> = {};
  for (const id of addresses)
    expressions[id] = stateAtom((get) => parseCell(get(inputs[id]!)));

  const cells = Object.fromEntries(
    addresses.map((id) => {
      const $value = stateAtom(
        (get): CellValue =>
          evaluateCell(
            id,
            (ref) => {
              const expression = expressions[ref];
              return expression
                ? get(expression)
                : { kind: 'literal', value: '#REF!' };
            },
            columns,
            rowCount,
          ),
      );
      return [id, { $input: inputs[id]!, $value }];
    }),
  );

  const $selected = stateAtom('D5');

  // A native writable derived atom remains usable in holo.write.
  const $formula = atom(
    (get) => get(inputs[get($selected)]!),
    (get, set, value: string) => set(inputs[get($selected)]!, value),
  );

  const reset = actionAtom((_get, set) => {
    for (const id of addresses) set(inputs[id]!, initial[id] ?? '');
    set($selected, 'D5');
  });

  return { cells, addresses, $selected, $formula, reset };
}
// #endregion sheet-model

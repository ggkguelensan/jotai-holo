import type { CellValue } from './types.js';

export class FormulaError extends Error {}

export function fail(code: string): never {
  throw new FormulaError(code);
}

const errors = new Set([
  '#REF!',
  '#CYCLE!',
  '#DIV/0!',
  '#VALUE!',
  '#FORMULA!',
  '#NUM!',
  '#LIMIT!',
]);

export const isCellError = (value: CellValue) =>
  typeof value === 'string' && errors.has(value);

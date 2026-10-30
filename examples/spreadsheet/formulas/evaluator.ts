import type { CellValue, Node } from './types.js';
import { FormulaError, fail, isCellError } from './errors.js';
import type { Dimensions } from '../coordinates.js';
import { formulaBudget, rangeAddresses } from './references.js';

/** Evaluate one expression; referenced values come from cached derived atoms. */
export function evaluateCell(
  expression: Node,
  read: (address: string) => CellValue,
  size: Dimensions,
): CellValue {
  let remaining = formulaBudget;
  function numeric(value: CellValue) {
    if (isCellError(value)) return fail(String(value));
    if (value === '') return 0;
    if (typeof value !== 'number') return fail('#VALUE!');
    return value;
  }
  function evaluate(node: Node): CellValue {
    if (--remaining < 0) fail('#LIMIT!');
    switch (node.kind) {
      case 'literal':
        return node.value;
      case 'ref':
        return read(node.address);
      case 'range':
        return fail('#VALUE!');
      case 'negative':
        return -numeric(evaluate(node.value));
      case 'binary': {
        const left = numeric(evaluate(node.left));
        const right = numeric(evaluate(node.right));
        switch (node.op) {
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          default:
            return right === 0 ? fail('#DIV/0!') : left / right;
        }
      }
      case 'sum': {
        let total = 0;
        for (const child of node.values) {
          if (child.kind === 'range') {
            for (const address of rangeAddresses(child, size)) {
              if (--remaining < 0) fail('#LIMIT!');
              const value = read(address);
              if (isCellError(value)) fail(String(value));
              if (typeof value === 'number') total += value;
            }
          } else {
            const value = evaluate(child);
            if (isCellError(value)) fail(String(value));
            if (typeof value === 'number') total += value;
          }
        }
        return total;
      }
    }
  }
  try {
    const value = evaluate(expression);
    if (typeof value === 'number' && !Number.isFinite(value)) fail('#NUM!');
    return value;
  } catch (error) {
    if (error instanceof FormulaError) return error.message;
    throw error;
  }
}

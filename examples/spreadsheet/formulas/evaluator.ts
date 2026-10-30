import type { CellValue, Node } from './types.js';
import { FormulaError, fail, isCellError } from './errors.js';

/** Read referenced expressions with a bounded local cycle stack. */
export function evaluateCell(
  address: string,
  read: (address: string) => Node,
  columns: readonly string[],
  rows: number,
): CellValue {
  const budget = 2048;
  let remaining = budget;
  const visiting = new Set<string>();
  const values = new Map<string, CellValue>();
  function numeric(value: CellValue) {
    if (isCellError(value)) return fail(String(value));
    if (value === '') return 0;
    if (typeof value !== 'number') return fail('#VALUE!');
    return value;
  }
  function range(node: Extract<Node, { kind: 'range' }>) {
    const from = node.from.match(/^([A-Z]+)(\d+)$/)!;
    const to = node.to.match(/^([A-Z]+)(\d+)$/)!;
    const a = columns.indexOf(from[1]!);
    const b = columns.indexOf(to[1]!);
    const first = Number(from[2]);
    const last = Number(to[2]);
    if (
      a < 0 ||
      b < 0 ||
      Math.min(first, last) < 1 ||
      Math.max(first, last) > rows
    )
      fail('#REF!');
    if ((Math.abs(a - b) + 1) * (Math.abs(first - last) + 1) > budget)
      fail('#LIMIT!');
    const result: string[] = [];
    for (let row = Math.min(first, last); row <= Math.max(first, last); row++)
      for (let col = Math.min(a, b); col <= Math.max(a, b); col++)
        result.push(`${columns[col]}${row}`);
    return result;
  }
  function evaluate(node: Node): CellValue {
    if (--remaining < 0) fail('#LIMIT!');
    switch (node.kind) {
      case 'literal':
        return node.value;
      case 'ref':
        return cell(node.address);
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
          const items =
            child.kind === 'range' ? range(child).map(cell) : [evaluate(child)];
          for (const value of items) {
            if (isCellError(value)) fail(String(value));
            if (typeof value === 'number') total += value;
          }
        }
        return total;
      }
    }
  }
  function cell(id: string): CellValue {
    if (visiting.size >= 128) fail('#LIMIT!');
    if (visiting.has(id)) return fail('#CYCLE!');
    if (values.has(id)) return values.get(id)!;
    visiting.add(id);
    try {
      const value = evaluate(read(id));
      if (typeof value === 'number' && !Number.isFinite(value)) fail('#NUM!');
      values.set(id, value);
      return value;
    } finally {
      visiting.delete(id);
    }
  }
  try {
    return cell(address);
  } catch (error) {
    if (error instanceof FormulaError) return error.message;
    throw error;
  }
}

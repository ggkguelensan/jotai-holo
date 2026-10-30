import { addressOf, contains, point, type Dimensions } from '../coordinates.js';
import { fail } from './errors.js';
import type { Node } from './types.js';

export const formulaBudget = 2048;

export function* rangeAddresses(
  node: Extract<Node, { kind: 'range' }>,
  size: Dimensions,
): Generator<string> {
  const from = checkedPoint(node.from, size);
  const to = checkedPoint(node.to, size);
  if (
    (Math.abs(from.row - to.row) + 1) *
      (Math.abs(from.column - to.column) + 1) >
    formulaBudget
  )
    fail('#LIMIT!');
  for (
    let row = Math.min(from.row, to.row);
    row <= Math.max(from.row, to.row);
    row++
  )
    for (
      let column = Math.min(from.column, to.column);
      column <= Math.max(from.column, to.column);
      column++
    )
      yield addressOf({ row, column });
}

export function checkedPoint(address: string, size: Dimensions) {
  try {
    const location = point(address);
    if (!contains(size, location)) fail('#REF!');
    return location;
  } catch (error) {
    if (error instanceof RangeError) fail('#REF!');
    throw error;
  }
}

/** Only SUM consumes ranges. Validate before creating dependency atoms. */
export function references(node: Node, size: Dimensions): string[] {
  const refs = new Set<string>();
  let remaining = formulaBudget;
  function visit(current: Node): void {
    if (--remaining < 0) fail('#LIMIT!');
    switch (current.kind) {
      case 'ref':
        checkedPoint(current.address, size);
        refs.add(current.address);
        break;
      case 'negative':
        visit(current.value);
        break;
      case 'binary':
        visit(current.left);
        visit(current.right);
        break;
      case 'sum':
        for (const child of current.values) {
          if (child.kind !== 'range') visit(child);
          else
            for (const address of rangeAddresses(child, size)) {
              if (--remaining < 0) fail('#LIMIT!');
              refs.add(address);
            }
        }
        break;
      case 'range':
        fail('#VALUE!');
    }
  }
  visit(node);
  return [...refs];
}

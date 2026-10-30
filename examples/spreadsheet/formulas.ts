export type CellValue = number | string;

type Node =
  | { kind: 'literal'; value: CellValue }
  | { kind: 'ref'; address: string }
  | { kind: 'range'; from: string; to: string }
  | { kind: 'negative'; value: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'sum'; values: Node[] };

class FormulaError extends Error {}
function fail(code: string): never {
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

/** A deliberately small grammar. No eval, Function, or JavaScript execution. */
export function parseCell(input: string): Node {
  const text = input.trim();
  if (!text.startsWith('=')) {
    const number = Number(text);
    return {
      kind: 'literal',
      value: !text ? '' : Number.isFinite(number) ? number : input,
    };
  }
  try {
    if (text.length > 512) fail('#FORMULA!');
    const source = text.slice(1).toUpperCase();
    const tokens: string[] = [];
    let offset = 0;
    while (offset < source.length) {
      if (/\s/.test(source[offset]!)) {
        offset++;
        continue;
      }
      const token = source
        .slice(offset)
        .match(
          /^(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?|^[A-Z]+\d*|^[+\-*/():,]/,
        )?.[0];
      if (!token) fail('#FORMULA!');
      tokens.push(token);
      offset += token.length;
    }
    let cursor = 0;
    const peek = () => tokens[cursor];
    const take = () => tokens[cursor++];
    function expect(token: string) {
      if (take() !== token) fail('#FORMULA!');
    }
    function primary(): Node {
      const token = take();
      if (!token) return fail('#FORMULA!');
      if (token === '+' || token === '-') {
        const value = primary();
        return token === '-' ? { kind: 'negative', value } : value;
      }
      if (token === '(') {
        const node = expression();
        expect(')');
        return node;
      }
      if (token === 'SUM') {
        expect('(');
        const values: Node[] = [];
        if (peek() !== ')') {
          values.push(expression());
          while (peek() === ',') {
            take();
            values.push(expression());
          }
        }
        expect(')');
        return { kind: 'sum', values };
      }
      if (/^[A-Z]+\d+$/.test(token)) {
        if (peek() === ':') {
          take();
          const to = take();
          if (!to || !/^[A-Z]+\d+$/.test(to)) fail('#FORMULA!');
          return { kind: 'range', from: token, to: to! };
        }
        return { kind: 'ref', address: token };
      }
      const value = Number(token);
      if (!Number.isFinite(value)) return fail('#FORMULA!');
      return { kind: 'literal', value };
    }
    function product(): Node {
      let left = primary();
      while (peek() === '*' || peek() === '/') {
        const op = take()!;
        left = { kind: 'binary', op, left, right: primary() };
      }
      return left;
    }
    function expression(): Node {
      let left = product();
      while (peek() === '+' || peek() === '-') {
        const op = take()!;
        left = { kind: 'binary', op, left, right: product() };
      }
      return left;
    }
    const result = expression();
    if (cursor !== tokens.length) fail('#FORMULA!');
    return result;
  } catch {
    return { kind: 'literal', value: '#FORMULA!' };
  }
}

/** Read only referenced expressions; a local stack detects cycles safely. */
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

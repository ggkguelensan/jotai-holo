import type { Node } from './types.js';
import { fail } from './errors.js';

/** A small grammar; it never executes JavaScript. */
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

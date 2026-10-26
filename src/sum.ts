import { atom, type Atom } from 'jotai/vanilla';
import { isAtom, sourceAtoms, type ScalarSource } from './operator-source.js';

/** Sum synchronous numbers, or the numbers in one array-valued atom. Empty inputs yield zero. */
export function sum(source: ScalarSource<number> | Atom<readonly number[]>): Atom<number> {
  if (isAtom(source)) {
    return atom((get) => {
      const value = get(source as Atom<number | readonly number[]>);
      return typeof value === 'number' ? value : value.reduce((total, item) => total + item, 0);
    });
  }
  const inputs = sourceAtoms(source);
  return atom((get) => inputs.reduce((total, input) => total + get(input), 0));
}

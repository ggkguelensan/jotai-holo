import { atom, type Atom } from 'jotai/vanilla';
import { isAtom } from './operator-source.js';

/** Compare a value with a constant or another atom using Object.is. */
export function eq<Value>(
  source: Atom<Value>,
  expected: NoInfer<Value> | Atom<NoInfer<Value>>,
): Atom<boolean> {
  return atom((get) => Object.is(get(source), isAtom(expected) ? get(expected) : expected));
}

import { atom, type Atom } from 'jotai/vanilla';
import { sourceAtoms, type ScalarSource } from './operator-source.js';

/** Boolean disjunction with short-circuit dependency tracking. Empty inputs yield false. */
export function or(source: ScalarSource<boolean>): Atom<boolean> {
  const inputs = sourceAtoms(source);
  return atom((get) => inputs.some((input) => get(input)));
}

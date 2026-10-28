import { atom, type Atom } from 'jotai/vanilla';
import { sourceAtoms, type ScalarSource } from './operator-source.js';

/** Boolean conjunction with short-circuit dependency tracking. Empty inputs yield true. */
export function and(source: ScalarSource<boolean>): Atom<boolean> {
  const inputs = sourceAtoms(source);
  return atom((get) => inputs.every((input) => get(input)));
}

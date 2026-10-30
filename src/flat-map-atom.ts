import { atom, type Atom, type WritableAtom } from 'jotai/vanilla';
import { readSource, type AtomSource, type SourceValue } from './atom-source.js';

type ValueOf<Target> = Target extends Atom<infer Value> ? Value : never;
type Access<Target extends Atom<unknown>> = [Target] extends [
  WritableAtom<unknown, infer Args, infer Result>,
]
  ? WritableAtom<ValueOf<Target>, Args, Result>
  : Atom<ValueOf<Target>>;

/** Follow a selected atom. Model ownership stays with the caller. */
export function flatMapAtom<const Source extends AtomSource, Target extends Atom<unknown>>(
  source: Source,
  select: (value: SourceValue<Source>) => Target,
): Access<Target> {
  const selected = atom((get) => select(readSource(get, source)));
  return atom(
    (get) => get(get(selected)),
    (get, set, ...args: unknown[]) => {
      const target = get(selected);
      if (!('write' in target) || typeof target.write !== 'function')
        throw new TypeError('flatMapAtom: the selected atom is read-only.');
      return set(target as WritableAtom<unknown, unknown[], unknown>, ...args);
    },
  ) as Access<Target>;
}

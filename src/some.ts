import { atom, type Atom } from 'jotai/vanilla';
import { isAtom, sourceAtoms } from './operator-source.js';

type CollectionSource =
  | Atom<readonly unknown[]>
  | readonly Atom<unknown>[]
  | { readonly [key: string]: Atom<unknown> };
type ItemOf<Source> =
  Source extends Atom<readonly (infer Item)[]>
    ? Item
    : Source extends readonly Atom<infer Item>[]
      ? Item
      : Source extends Record<string, Atom<infer Item>>
        ? Item
        : never;

/** Test array items or atom values, stopping at the first matching item. */
export function some<const Source extends CollectionSource>(
  source: Source,
  predicate: (value: ItemOf<Source>, index: number) => boolean,
): Atom<boolean> {
  if (isAtom(source)) {
    return atom((get) => get(source as Atom<readonly ItemOf<Source>[]>).some(predicate));
  }
  const inputs = sourceAtoms(source);
  return atom((get) =>
    inputs.some((input, index) => predicate(get(input) as ItemOf<Source>, index)),
  );
}

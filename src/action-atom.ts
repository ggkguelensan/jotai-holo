import { atom, type Getter, type Setter } from 'jotai/vanilla';

/** A write-only atom. Create actions inside the model factory that owns them. */
function createActionAtom<Args extends unknown[], Result>(
  write: (get: Getter, set: Setter, ...args: Args) => Result,
) {
  return atom<null, Args, Result>(null, write);
}

export const actionAtom = createActionAtom;

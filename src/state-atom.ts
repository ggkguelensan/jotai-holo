import { atom, type Atom, type Getter, type PrimitiveAtom } from 'jotai/vanilla';

/** State is writable through actions; derived state receives only get and is read-only. */
function createStateAtom<Value>(read: (get: Getter) => Value): Atom<Value>;
function createStateAtom<Value>(
  initialValue: Value extends (...args: never[]) => unknown ? never : Value,
): PrimitiveAtom<Value>;
function createStateAtom(initialValue: unknown): Atom<unknown> {
  if (isStateRead(initialValue)) {
    return atom((get) => initialValue(get));
  }
  return atom(initialValue);
}

export const stateAtom = createStateAtom;

function isStateRead(value: unknown): value is (get: Getter) => unknown {
  return typeof value === 'function';
}

import type { Atom } from 'jotai/vanilla';

export function isAtom(value: unknown): value is Atom<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'read' in value &&
    typeof value.read === 'function'
  );
}

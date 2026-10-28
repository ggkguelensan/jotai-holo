import type { Atom } from 'jotai/vanilla';

export type ScalarSource<Value> =
  | Atom<Value>
  | readonly Atom<Value>[]
  | { readonly [key: string]: Atom<Value> };

export function isAtom(value: unknown): value is Atom<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'read' in value &&
    typeof value.read === 'function'
  );
}

export function sourceAtoms<Value>(source: ScalarSource<Value>): readonly Atom<Value>[] {
  if (isAtom(source)) return [source as Atom<Value>];
  return Array.isArray(source) ? source : Object.values(source);
}

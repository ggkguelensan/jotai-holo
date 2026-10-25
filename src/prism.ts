import { atom, type Atom } from 'jotai/vanilla';

export function prism<Value, const Shape extends Record<string, (value: Value) => unknown>>(
  source: Atom<Value>,
  shape: Shape,
): { [Key in keyof Shape]: Atom<ReturnType<Shape[Key]>> } {
  return Object.fromEntries(
    Object.entries(shape).map(([key, project]) => [key, atom((get) => project(get(source)))]),
  ) as { [Key in keyof Shape]: Atom<ReturnType<Shape[Key]>> };
}

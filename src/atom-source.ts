import type { Atom, Getter } from 'jotai/vanilla';

export type AtomSource =
  | Atom<unknown>
  | readonly Atom<unknown>[]
  | { readonly [key: string]: Atom<unknown> };
export type SourceValue<Source> =
  Source extends Atom<infer Value>
    ? Value
    : {
        -readonly [Key in keyof Source]: Source[Key] extends Atom<infer Value> ? Value : never;
      };

export function readSource<Source extends AtomSource>(
  get: Getter,
  source: Source,
): SourceValue<Source> {
  if ('read' in source && typeof source.read === 'function')
    return get(source as Atom<unknown>) as SourceValue<Source>;
  if (Array.isArray(source)) return source.map((target) => get(target)) as SourceValue<Source>;
  return Object.fromEntries(
    Object.entries(source).map(([key, target]) => [key, get(target)]),
  ) as SourceValue<Source>;
}

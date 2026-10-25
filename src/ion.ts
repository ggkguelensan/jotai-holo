import { atom, type Atom } from 'jotai/vanilla';
import { readSource, type AtomSource, type SourceValue } from './atom-source.js';

export function ion<const Source extends AtomSource>(source: Source): Atom<SourceValue<Source>>;
export function ion<const Source extends AtomSource, Value>(
  source: Source,
  project: (value: SourceValue<Source>) => Value,
): Atom<Value>;
export function ion(source: AtomSource, project?: (value: never) => unknown) {
  return atom((get) => {
    const value = readSource(get, source);
    return project ? project(value as never) : value;
  });
}

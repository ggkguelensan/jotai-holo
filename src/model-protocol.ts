import type { Atom, createStore } from 'jotai/vanilla';

export type Store = ReturnType<typeof createStore>;
export const modelDefinition = Symbol('holo.model.definition');
export const modelIdentity = Symbol('holo.model.identity');
export const modelAcquire = Symbol('holo.model.acquire');

export type ModelAtom<Model extends object> = Atom<Model> & {
  readonly [modelIdentity]: { readonly definition: object; readonly key: string };
  readonly [modelAcquire]: (store: Store) => () => void;
};

export function sameModel(first: Atom<object>, second: Atom<object>): boolean {
  if (first === second) return true;
  if (!(modelIdentity in first) || !(modelIdentity in second)) return false;
  const a = (first as ModelAtom<object>)[modelIdentity];
  const b = (second as ModelAtom<object>)[modelIdentity];
  return a.definition === b.definition && a.key === b.key;
}

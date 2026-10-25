import { atom, type Atom, type Getter } from 'jotai/vanilla';

export const actionSource = Symbol('holo.action');
export type ActionChannel<Args extends readonly unknown[]> = {
  emit?: (args: Args) => void;
};
export type ActionSource<Args extends readonly unknown[]> = {
  readonly [actionSource]: Atom<ActionChannel<Args>>;
};
export function createActionChannel<Args extends readonly unknown[]>() {
  // The publisher is installed by consumers, separately in each store.
  return atom<ActionChannel<Args>>(() => ({}));
}
export function emitAction<Args extends readonly unknown[]>(
  get: Getter,
  channel: Atom<ActionChannel<Args>>,
  args: Args,
) {
  get(channel).emit?.(args);
}
export function isActionSource(value: unknown): value is ActionSource<readonly unknown[]> {
  return typeof value === 'object' && value !== null && actionSource in value;
}

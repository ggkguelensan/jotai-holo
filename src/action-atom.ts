import { atom, type Getter, type Setter, type WritableAtom } from 'jotai/vanilla';
import {
  actionSource,
  createActionChannel,
  emitAction,
  type ActionSource,
} from './action-source.js';

export type ActionAtom<Args extends unknown[], Result> = WritableAtom<null, Args, Result> &
  ActionSource<Args>;

/** Fires observers after the synchronous handler returns; does not await async results. */
export function actionAtom<Args extends unknown[] = []>(): ActionAtom<Args, void>;
export function actionAtom<Args extends unknown[], Result>(
  write: (get: Getter, set: Setter, ...args: Args) => Result,
): ActionAtom<Args, Result>;
export function actionAtom(
  write?: (get: Getter, set: Setter, ...args: never[]) => unknown,
): WritableAtom<null, never[], unknown> {
  const channel = createActionChannel<never[]>();
  const target = atom(null, (get, set, ...args: never[]) => {
    const result = write?.(get, set, ...args);
    emitAction(get, channel, args);
    return result;
  });
  return Object.assign(target, { [actionSource]: channel });
}

import { actionAtom, type ActionAtom } from './action-atom.js';

type EventArgs<Payload> = [Payload] extends [void] ? [payload?: Payload] : [payload: Payload];
export type EventAtom<Payload = void> = ActionAtom<EventArgs<Payload>, void>;

/** A native write-only atom that publishes one payload without storing it. */
export function eventAtom<Payload = void>(): EventAtom<Payload> {
  return actionAtom<EventArgs<Payload>>();
}

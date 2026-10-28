import type { createStore } from 'jotai/vanilla';
import { actionAtom, bond, type BondOptions, type EventAtom } from '../src/vanilla.js';

// Tests observe events through the same public routing API as applications.
export function captureEvent<Payload>(
  store: ReturnType<typeof createStore>,
  event: EventAtom<Payload>,
  receive: (payload: Payload) => unknown,
  options?: BondOptions,
) {
  const record = actionAtom((_get, _set, payload?: Payload) => receive(payload as Payload));
  return bond({ trigger: event, write: record }).connect(store, options);
}

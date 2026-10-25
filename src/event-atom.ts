import type { createStore } from 'jotai/vanilla';
import { actionAtom, type ActionAtom } from './action-atom.js';
import { actionSource, enqueueAction } from './action-source.js';

type Store = ReturnType<typeof createStore>;
type EventArgs<Payload> = [Payload] extends [void] ? [payload?: Payload] : [payload: Payload];
export type EventOptions = { onError?: (error: unknown) => void };
export type EventAtom<Payload = void> = ActionAtom<EventArgs<Payload>, void> & {
  subscribe(
    store: Store,
    listener: (payload: Payload) => unknown,
    options?: EventOptions,
  ): () => void;
};

/** A store-scoped occurrence, without a write handler, retained payload or replay. */
export function eventAtom<Payload = void>(): EventAtom<Payload> {
  const event = actionAtom<EventArgs<Payload>>();
  return Object.assign(event, {
    subscribe(store: Store, listener: (payload: Payload) => unknown, options: EventOptions = {}) {
      const listeners = store.get(event[actionSource]);
      let callback: typeof listener | undefined = listener;
      let onError = options.onError;
      const report = (error: unknown) => {
        try {
          if (onError) onError(error);
          else console.error(error);
        } catch (failure) {
          console.error(failure);
        }
      };
      const observe = (args: EventArgs<Payload>) =>
        enqueueAction(
          store.get,
          () => {
            if (!callback) return;
            try {
              const result = callback(args[0] as Payload);
              if (isPromise(result)) void Promise.resolve(result).catch(report);
            } catch (error) {
              report(error);
            }
          },
          report,
        );
      listeners.add(observe);
      return () => {
        listeners.delete(observe);
        callback = undefined;
        onError = undefined;
      };
    },
  });
}
function isPromise(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

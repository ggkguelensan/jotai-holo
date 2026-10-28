import type { createStore } from 'jotai/vanilla';
import { actionSource } from './action-source.js';
import type { EventAtom } from './event-atom.js';
import { enqueueAction, subscribeAction } from './event-dispatch.js';

type Store = ReturnType<typeof createStore>;
export type EventOptions = { onError?: (error: unknown) => void };

/** Store-owned observation is separate from the publishing atom. */
export function subscribeEvent<Payload>(
  store: Store,
  event: EventAtom<Payload>,
  listener: (payload: Payload) => unknown,
  options: EventOptions = {},
): () => void {
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
  const stop = subscribeAction(store.get, event[actionSource], (args) =>
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
    ),
  );
  return () => {
    stop();
    callback = undefined;
    onError = undefined;
  };
}
function isPromise(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

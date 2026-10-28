import type { Getter, Setter } from 'jotai/vanilla';
import { createModel } from '../src/model-registry.js';

/** Count actual model owners in binding tests, independently of View renders. */
export function modelLifetime(callbacks: {
  onMount?: (get: Getter, set: Setter) => unknown;
  onUnmount?: (get: Getter, set: Setter) => unknown;
}) {
  return createModel({
    create: () => ({}),
    resources: () => [
      {
        connect(store) {
          callbacks.onMount?.(store.get, store.set);
          return () => {
            callbacks.onUnmount?.(store.get, store.set);
          };
        },
      },
    ],
  });
}

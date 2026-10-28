'use client';

import React, { forwardRef, memo, type ReactNode } from 'react';

type PromiseState =
  | { status: 'pending' }
  | { status: 'fulfilled'; value: unknown }
  | { status: 'rejected'; reason: unknown };
const states = new WeakMap<PromiseLike<unknown>, PromiseState>();
const nativeUse = Reflect.get(React, 'use') as
  | (<Value>(promise: PromiseLike<Value>) => Value)
  | undefined;

/** React 18 Suspense retries the same cached promise; keep its settlement weakly. */
export const usePromise =
  nativeUse ??
  function readPromise<Value>(promise: PromiseLike<Value>): Value {
    let state = states.get(promise);
    if (!state) {
      state = { status: 'pending' };
      states.set(promise, state);
      Promise.resolve(promise).then(
        (value) => states.set(promise, { status: 'fulfilled', value }),
        (reason) => states.set(promise, { status: 'rejected', reason }),
      );
    }
    if (state.status === 'fulfilled') return state.value as Value;
    if (state.status === 'rejected') throw state.reason;
    throw promise;
  };

/** React 19 treats ref as a prop; React 18 needs an explicit forwarding boundary. */
export function memoWithRef<Props extends object>(render: (props: Props) => ReactNode) {
  if (nativeUse) return memo(render);
  return memo(
    forwardRef<unknown, Props>(function HoloRef(props, ref) {
      return render({ ...props, ...(ref === null ? {} : { ref }) } as Props);
    }),
  );
}

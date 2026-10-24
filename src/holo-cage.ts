'use client';

import { atom, useSetAtom, type Getter, type Setter } from 'jotai';
import { useEffect, useRef } from 'react';

export type CageContext<Props> = { readonly props: Readonly<Props> };
type CageCallback<Props> = (get: Getter, set: Setter, ctx: CageContext<Props>) => undefined;
export type HoloCage<Props> = {
  onMount?: CageCallback<Props>;
  onChange?: CageCallback<Props>;
  onUnmount?: CageCallback<Props>;
};
type Phase = 'onMount' | 'onChange' | 'onUnmount';
type InputProps = Record<string, unknown>;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

export function createCageAtom(cage: HoloCage<never>) {
  return atom(null, (get, set, event: { phase: Phase; props: InputProps }) => {
    const callback = cage[event.phase];
    if (!callback) return;
    const result: unknown = Reflect.apply(callback, undefined, [get, set, { props: event.props }]);
    if (isPromiseLike(result)) {
      // Report the invalid contract synchronously; avoid a second, unhandled rejection.
      void Promise.resolve(result).catch(() => undefined);
      throw new TypeError(
        `holo: cage.${event.phase} must be synchronous. Start async work in an actionAtom and handle its rejection.`,
      );
    }
  });
}

function sameProps(first: InputProps, second: InputProps) {
  const keys = Object.keys(first);
  return (
    keys.length === Object.keys(second).length &&
    keys.every((key) => Object.hasOwn(second, key) && Object.is(first[key], second[key]))
  );
}

export function useHoloCage(cageAtom: ReturnType<typeof createCageAtom>, props: InputProps) {
  const dispatch = useSetAtom(cageAtom);
  const committedProps = useRef(props);
  const previous = useRef<{ dispatch: typeof dispatch; props: InputProps } | null>(null);

  useEffect(() => {
    committedProps.current = props;
  });
  useEffect(() => {
    dispatch({ phase: 'onMount', props: committedProps.current });
    return () => {
      previous.current = null;
      dispatch({ phase: 'onUnmount', props: committedProps.current });
    };
  }, [dispatch]);
  useEffect(() => {
    const current = committedProps.current;
    if (previous.current?.dispatch === dispatch && sameProps(previous.current.props, current))
      return;
    previous.current = { dispatch, props: current };
    dispatch({ phase: 'onChange', props: current });
  });
}

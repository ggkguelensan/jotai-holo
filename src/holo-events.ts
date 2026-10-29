'use client';

import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type Ref } from 'react';

export type HoloEvents<Handlers extends object> = Ref<Handlers>;
const useCommitEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** A stable method table backed exclusively by committed handlers. No atom subscriptions. */
export function useHoloEvents<
  Handlers extends { [Key in keyof Handlers]: (...args: never[]) => unknown },
>(events: HoloEvents<Handlers>, handlers: Handlers): void {
  const committed = useRef<Handlers | undefined>(undefined);
  const handle = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(handlers).map((key) => [
          key,
          (...args: unknown[]) => {
            const current = committed.current;
            if (current) return Reflect.apply(current[key as keyof Handlers], current, args);
            return undefined;
          },
        ]),
      ) as unknown as Handlers,
    [],
  );
  if (
    Object.keys(handlers).length !== Object.keys(handle).length ||
    Object.keys(handlers).some((key) => !Object.hasOwn(handle, key))
  )
    throw new TypeError('useHoloEvents: method names must remain stable.');
  // No dependency array: refresh after every commit, including context-only updates.
  useImperativeHandle(events, () => {
    committed.current = handlers;
    return handle;
  });
  useCommitEffect(
    () => () => {
      committed.current = undefined;
    },
    [],
  );
}

'use client';

import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type Ref } from 'react';

export type HoloImperative<Handle extends object> = Ref<Handle>;
const useCommitEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** A stable method table backed exclusively by committed handlers. No atom subscriptions. */
export function useImperativeHolo<
  Handle extends { [Key in keyof Handle]: (...args: never[]) => unknown },
>(imperative: HoloImperative<Handle>, handlers: Handle): void {
  const committed = useRef<Handle | undefined>(undefined);
  const handle = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(handlers).map((key) => [
          key,
          (...args: unknown[]) => {
            const current = committed.current;
            if (current) return Reflect.apply(current[key as keyof Handle], current, args);
            return undefined;
          },
        ]),
      ) as unknown as Handle,
    [],
  );
  if (
    Object.keys(handlers).length !== Object.keys(handle).length ||
    Object.keys(handlers).some((key) => !Object.hasOwn(handle, key))
  )
    throw new TypeError('useImperativeHolo: method names must remain stable.');
  useImperativeHandle(imperative, () => {
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

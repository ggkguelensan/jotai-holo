'use client';

import { useAtomValue, useStore, type Atom } from 'jotai';
import {
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentType,
  type ElementType,
} from 'react';
import { modelAcquire, modelDefinition, sameModel, type ModelAtom } from './model-protocol.js';
import { memoWithRef } from './react-compat.js';

export type ModelSource = Atom<object> | ((...args: never[]) => Atom<object>);
export type ModelValue<Source> =
  Source extends Atom<infer Model>
    ? Awaited<Model>
    : Source extends (...args: never[]) => Atom<infer Model>
      ? Awaited<Model>
      : never;
export type ModelInputs<Source> = Source extends { readonly [modelDefinition]: true }
  ? {}
  : Source extends (props: infer Props) => Atom<object>
    ? Props
    : {};

export type ModelRuntimeConfig = {
  model: ModelSource;
  core: ElementType;
  state?: Record<string, unknown> | ((model: never) => Record<string, unknown>) | undefined;
  actions?: Record<string, unknown> | ((model: never) => Record<string, unknown>) | undefined;
  bindProps?: Record<string, unknown>;
  cage?: unknown;
};

const useCommitEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** Resolve models using ordinary atoms. The registry implementation is not imported by core. */
export function bindModel(
  config: ModelRuntimeConfig,
  connect: (config: unknown, model: object) => ComponentType<Record<string, unknown>>,
) {
  const connected = new WeakMap<object, ComponentType<Record<string, unknown>>>();
  const { model: source, ...base } = config;
  return memoWithRef(function HoloModel(props: Record<string, unknown>) {
    const candidate =
      typeof source === 'function'
        ? (Reflect.apply(source, undefined, [
            modelDefinition in source ? undefined : props,
          ]) as Atom<object>)
        : source;
    const previous = useRef(candidate);
    if (!sameModel(previous.current, candidate)) previous.current = candidate;
    const selected = previous.current;
    const model = useAtomValue(selected);
    const store = useStore();
    const lease = useMemo(
      () => ({ release: undefined as (() => void) | undefined }),
      [selected, store, model],
    );
    // Connect before child passive cages. Release in the passive lifetime so temporary
    // Suspense hiding does not evict a still-mounted model or disconnect its reactions.
    useCommitEffect(() => {
      if (!lease.release && modelAcquire in selected)
        lease.release = (selected as ModelAtom<object>)[modelAcquire](store);
    }, [lease, selected, store]);
    useEffect(
      () => () => {
        const release = lease.release;
        lease.release = undefined;
        // React cleans up parents before children. Keep reactions alive for child cage.onUnmount events.
        if (release) queueMicrotask(release);
      },
      [lease],
    );
    let Connected = connected.get(model);
    if (!Connected) {
      Connected = connect(
        {
          ...base,
          state: typeof base.state === 'function' ? base.state(model as never) : base.state,
          actions: typeof base.actions === 'function' ? base.actions(model as never) : base.actions,
          cage: typeof base.cage === 'function' ? base.cage(model) : base.cage,
        },
        model,
      );
      connected.set(model, Connected);
    }
    return createElement(Connected, props);
  });
}

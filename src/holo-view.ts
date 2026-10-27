'use client';

import { useStore, type Atom, type Getter, type Setter, type WritableAtom } from 'jotai';
import {
  createElement,
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ComponentType,
  type NamedExoticComponent,
} from 'react';
import { memoWithRef } from './react-compat.js';
import { createUseBindingState } from './binding-state.js';
import { modelAcquire, modelDefinition, sameModel, type ModelAtom } from './model-protocol.js';
import type { ModelInputs, ModelSource, ModelValue } from './model-binding.js';
import { acquireResources, type Resource } from './resource.js';
import type { ActionSource } from './action-source.js';
import { isActionSource, actionSource } from './action-source.js';
import { subscribeAction, enqueueAction } from './event-dispatch.js';
import type { HoloImperative } from './imperative.js';
import type { BindingKeys, OwnProps } from './holo.js';

type PropsOf<View extends ElementType> = ComponentPropsWithRef<View>;
type Models = Record<string, ModelSource>;
export type ResolvedModels<Sources extends Models> = {
  [Key in keyof Sources]: ModelValue<Sources[Key]>;
};
type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer I,
) => void
  ? I
  : never;
type SourceInputs<Sources extends Models> = keyof Sources extends never
  ? {}
  : UnionToIntersection<ModelInputs<Sources[keyof Sources]>>;
type Bindings<Value, Sources extends Models> = Value | ((models: ResolvedModels<Sources>) => Value);
type Callable<Value> =
  NonNullable<Value> extends (...args: infer Args) => infer Result
    ? WritableAtom<unknown, Args, Result>
    : never;
type HandleOf<Props> = Props extends { imperative: HoloImperative<infer Handle> } ? Handle : {};
type ImperativeMap<Props> = {
  [Key in keyof HandleOf<Props>]: HandleOf<Props>[Key] extends (...args: infer Args) => unknown
    ? ActionSource<Args>
    : never;
};
type InputProps<View extends ElementType, R extends PropertyKey, W extends PropertyKey> = OwnProps<
  PropsOf<View>,
  R | W | 'imperative'
>;
export type LifecycleContext<Input, Model> = {
  readonly input: Readonly<Input>;
  readonly models: Readonly<Model>;
};
type LifecycleHandler<Input, Model> =
  | ((get: Getter, set: Setter, context: LifecycleContext<Input, Model>) => void)
  | WritableAtom<unknown, [LifecycleContext<Input, Model>], unknown>
  | WritableAtom<unknown, [], unknown>;
export type HoloLifecycle<Input, Model = {}> = {
  input?: (input: Readonly<Input>) => Readonly<Record<string, unknown>>;
  onMount?: LifecycleHandler<Input, Model>;
  onInputChange?: LifecycleHandler<Input, Model>;
  onUnmount?: LifecycleHandler<Input, Model>;
};

export type HoloViewConfig<
  View extends ElementType,
  Sources extends Models = {},
  ReadKeys extends BindingKeys<PropsOf<NoInfer<View>>> = never,
  WriteKeys extends BindingKeys<PropsOf<NoInfer<View>>> = never,
  StaticKeys extends BindingKeys<PropsOf<NoInfer<View>>> = never,
> = {
  view: View;
  models?: Sources;
  read?: Bindings<
    {
      [Key in ReadKeys]: Key extends 'imperative'
        ? never
        : Atom<NoInfer<PropsOf<View>[Key]> | PromiseLike<NoInfer<PropsOf<View>[Key]>>>;
    },
    Sources
  >;
  write?: Bindings<
    { [Key in WriteKeys]: Key extends ReadKeys ? never : Callable<PropsOf<NoInfer<View>>[Key]> },
    Sources
  >;
  props?: {
    [Key in StaticKeys]: Key extends ReadKeys | WriteKeys | 'imperative'
      ? never
      : NoInfer<PropsOf<View>[Key]>;
  };
  lifecycle?: HoloLifecycle<
    InputProps<NoInfer<View>, ReadKeys, WriteKeys> & SourceInputs<Sources>,
    ResolvedModels<Sources>
  >;
  resources?: Bindings<readonly Resource[], Sources>;
  onError?: (error: unknown) => void;
} & (PropsOf<NoInfer<View>> extends { imperative: HoloImperative<object> }
  ? { imperative: Bindings<ImperativeMap<PropsOf<NoInfer<View>>>, Sources> }
  : { imperative?: never });
type Simplify<Value> = { [Key in keyof Value]: Value[Key] };
export type HoloViewComponent<
  V extends ElementType,
  S extends Models,
  R extends PropertyKey,
  W extends PropertyKey,
  P extends PropertyKey,
> = NamedExoticComponent<
  Simplify<OwnProps<PropsOf<V>, R | W | P | 'imperative'> & SourceInputs<S>>
>;

type RecordValue = Record<string, unknown>;
type RuntimeFactory<Value> = Value | ((models: RecordValue) => Value);
export type ViewRuntimeConfig = {
  view: ElementType;
  models?: Models;
  read?: RuntimeFactory<Record<string, Atom<unknown>>>;
  write?: RuntimeFactory<Record<string, WritableAtom<unknown, never[], unknown>>>;
  props?: RecordValue;
  imperative?: RuntimeFactory<Record<string, ActionSource<never[]>>>;
  resources?: RuntimeFactory<readonly Resource[]>;
  lifecycle?: HoloLifecycle<RecordValue, RecordValue>;
  onError?: (error: unknown) => void;
};
const useCommitEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;
const resolveFactory = <Value>(
  factory: RuntimeFactory<Value> | undefined,
  models: RecordValue,
  fallback: Value,
): Value =>
  typeof factory === 'function'
    ? (factory as (m: RecordValue) => Value)(models)
    : (factory ?? fallback);
const sameInput = (a: Readonly<RecordValue>, b: Readonly<RecordValue>) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]));

export function connectView(config: ViewRuntimeConfig) {
  const sources = Object.entries(config.models ?? {});
  const View = typeof config.view === 'string' ? config.view : memo(config.view);
  const report = (error: unknown) => {
    try {
      if (config.onError) config.onError(error);
      else console.error(error);
    } catch (failure) {
      console.error(failure);
    }
  };
  const lifecycle = config.lifecycle;
  const hasImperative = config.imperative !== undefined;
  const staticProps = { ...config.props };
  const useModels = createUseBindingState(sources.map(([key]) => key));
  const cache = new WeakMap<object, ComponentType<RecordValue>>();
  function bind(models: RecordValue, selections: readonly Atom<object>[]) {
    const resolved = (() => {
      const read = resolveFactory(config.read, models, {});
      const write = resolveFactory(config.write, models, {});
      const imperative = resolveFactory(config.imperative, models, {});
      const keys = new Set<string>();
      for (const section of [read, write, staticProps])
        for (const key of Object.keys(section)) {
          if (key === 'imperative' || keys.has(key))
            throw new Error(
              `holo: prop "${key}" is configured in more than one section or reserved.`,
            );
          keys.add(key);
        }
      for (const source of Object.values(imperative))
        if (!isActionSource(source))
          throw new TypeError('holo.imperative requires an eventAtom or actionAtom event source.');
      return {
        reads: Object.entries(read),
        write,
        imperative,
        resources: resolveFactory(config.resources, models, []),
      };
    })();
    const useValues = createUseBindingState(resolved.reads.map(([key]) => key));
    return memoWithRef(function HoloResolved(ownProps: RecordValue) {
      const store = useStore();
      const input = { ...ownProps, ...staticProps };
      const values = useValues(resolved.reads);
      const callbacks = useMemo(
        () =>
          Object.fromEntries(
            Object.entries(resolved.write).map(([key, target]) => [
              key,
              (...args: unknown[]) => Reflect.apply(store.set, store, [target, ...args]),
            ]),
          ),
        [store, resolved],
      );
      const handle = useRef<Record<string, (...args: never[]) => unknown> | null>(null);
      const committed = useMemo(() => ({ input, models }), [store, models, resolved]);
      useCommitEffect(() => {
        committed.input = input;
      });
      const callLifecycle = (phase: 'onMount' | 'onInputChange' | 'onUnmount') => {
        const handler = lifecycle?.[phase];
        if (!handler) return;
        const context = committed;
        const result: unknown =
          typeof handler === 'function'
            ? handler(store.get, store.set, context)
            : Reflect.apply(store.set, store, [handler, context]);
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          void Promise.resolve(result).catch(report);
          throw new TypeError(
            `holo.lifecycle.${phase} must be synchronous; start async work in a handled action.`,
          );
        }
      };
      const lease = useMemo(
        () => ({ release: undefined as (() => void) | undefined }),
        [store, models, resolved],
      );
      // Child useImperativeHandle publishes before this parent layout effect.
      // Install event delivery before model resource activation can publish events.
      useCommitEffect(() => {
        const stops = Object.entries(resolved.imperative).map(([key, source]) =>
          subscribeAction(store.get, source[actionSource], (args) =>
            enqueueAction(
              store.get,
              () => {
                const method = handle.current?.[key];
                if (!handle.current) return;
                if (typeof method !== 'function') {
                  report(new TypeError(`holo.imperative: View does not expose method "${key}".`));
                  return;
                }
                try {
                  const result = Reflect.apply(method, handle.current, args);
                  if (result && typeof (result as PromiseLike<unknown>).then === 'function')
                    void Promise.resolve(result).catch(report);
                } catch (error) {
                  report(error);
                }
              },
              report,
            ),
          ),
        );
        try {
          if (!lease.release) {
            const modelResources: Resource[] = selections
              .filter((selection): selection is ModelAtom<object> => modelAcquire in selection)
              .map((selection) => ({ connect: () => selection[modelAcquire](store) }));
            lease.release = acquireResources(store, [...modelResources, ...resolved.resources]);
          }
        } catch (error) {
          for (const stop of stops.reverse()) stop();
          throw error;
        }
        return () => {
          for (const stop of stops.reverse()) stop();
        };
      }, [lease, store, resolved]);
      const lifetime = useMemo(
        () => ({
          active: false,
          revision: 0,
          previous: undefined as Readonly<RecordValue> | undefined,
        }),
        [lease],
      );
      useEffect(() => {
        lifetime.revision++;
        if (!lifetime.active) {
          lifetime.active = true;
          try {
            callLifecycle('onMount');
          } catch (error) {
            report(error);
          }
        }
        return () => {
          const revision = ++lifetime.revision;
          // StrictMode cleanup/setup is one logical owner; real cleanup closes it.
          queueMicrotask(() => {
            if (lifetime.revision !== revision) return;
            lifetime.active = false;
            try {
              callLifecycle('onUnmount');
            } catch (error) {
              report(error);
            }
            const release = lease.release;
            lease.release = undefined;
            try {
              release?.();
            } catch (error) {
              report(error);
            }
          });
        };
      }, [lifetime]);
      useEffect(() => {
        const selected = lifecycle?.input?.(input) ?? input;
        if (lifetime.previous && sameInput(lifetime.previous, selected)) return;
        lifetime.previous = { ...selected };
        try {
          callLifecycle('onInputChange');
        } catch (error) {
          report(error);
        }
      });
      return createElement(View, {
        ...ownProps,
        ...staticProps,
        ...values,
        ...callbacks,
        ...(hasImperative ? { imperative: handle } : {}),
      });
    });
  }
  const Connected = memoWithRef(function HoloView(ownProps: RecordValue) {
    const input = { ...ownProps, ...staticProps };
    const candidates = sources.map(([, source]) =>
      typeof source === 'function'
        ? (Reflect.apply(source, undefined, [
            modelDefinition in source ? undefined : input,
          ]) as Atom<object>)
        : source,
    );
    const previous = useRef(candidates);
    const selections = candidates.map((candidate, index) =>
      sameModel(previous.current[index]!, candidate) ? previous.current[index]! : candidate,
    );
    // Identity cache only; no effects or handlers are published from render.
    previous.current = selections;
    const models = useModels(sources.map(([key], index) => [key, selections[index]!]));
    let Resolved = cache.get(models);
    if (!Resolved) {
      Resolved = bind(models, selections);
      cache.set(models, Resolved);
    }
    return createElement(Resolved, ownProps);
  });
  const name =
    typeof config.view === 'string'
      ? config.view
      : (config.view.displayName ?? config.view.name ?? 'View');
  Connected.displayName = `holo(${name})`;
  return Connected;
}

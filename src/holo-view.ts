'use client';

import { useStore, type Atom, type WritableAtom } from 'jotai';
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
import {
  modelAcquire,
  modelDefinition,
  modelIdentity,
  sameModel,
  type ModelAtom,
} from './model-protocol.js';
import type { ModelInputs, ModelSource, ModelValue } from './holo-types.js';
import { acquireResources, type Resource } from './resource.js';
import type { ActionSource } from './action-source.js';
import { isActionSource, actionSource } from './action-source.js';
import { subscribeAction, enqueueAction } from './event-dispatch.js';
import type { HoloImperative } from './imperative.js';
import type { BindingKeys, OwnProps } from './holo-types.js';

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
type ResolvedProp<Value> = Value extends PromiseLike<unknown> ? never : Value;
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
type InputBindings<Input> = {
  [Key in keyof Input]?: WritableAtom<unknown, [Input[Key]], unknown>;
};

export type HoloConfig<
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
        : Atom<
            | NoInfer<ResolvedProp<PropsOf<View>[Key]>>
            | PromiseLike<NoInfer<ResolvedProp<PropsOf<View>[Key]>>>
          >;
    },
    Sources
  >;
  write?: Bindings<
    { [Key in WriteKeys]: Key extends ReadKeys ? never : Callable<PropsOf<NoInfer<View>>[Key]> },
    Sources
  >;
  staticProps?: {
    [Key in StaticKeys]: Key extends ReadKeys | WriteKeys | 'imperative'
      ? never
      : NoInfer<PropsOf<View>[Key]>;
  };
  inputProps?: Bindings<
    InputBindings<
      InputProps<NoInfer<View>, NoInfer<ReadKeys>, NoInfer<WriteKeys>> &
        SourceInputs<NoInfer<Sources>>
    > & {
      [Key in NoInfer<ReadKeys | WriteKeys> | 'imperative']?: never;
    },
    Sources
  >;
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
  staticProps?: RecordValue;
  imperative?: RuntimeFactory<Record<string, ActionSource<never[]>>>;
  inputProps?: RuntimeFactory<Record<string, WritableAtom<unknown, never[], unknown>>>;
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

export function connectView(
  config: ViewRuntimeConfig,
  wrap?: (models: RecordValue, view: ElementType) => ElementType,
) {
  for (const field of [
    'core',
    'state',
    'actions',
    'bindProps',
    'props',
    'input',
    'cage',
    'model',
    'lifecycle',
    'resources',
  ])
    if (field in config)
      throw new TypeError(
        `holo: unsupported field "${field}". Use view/read/write/staticProps/models/inputProps.`,
      );
  if (!config.view) throw new TypeError('holo: view is required.');
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
  const hasImperative = config.imperative !== undefined;
  const staticProps = { ...config.staticProps };
  const useModels = createUseBindingState(sources.map(([key]) => key));
  type Owner = { current?: { lease: object; close(): void } | undefined };
  type BoundInput = { ownProps: RecordValue; owner: Owner };
  type Cache = { next?: WeakMap<object, Cache>; view?: ComponentType<BoundInput> };
  const cache: Cache = {};
  function bind(models: RecordValue, selections: readonly Atom<object>[]) {
    const RenderedView = wrap?.(models, View) ?? View;
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
        input: Object.entries(resolveFactory(config.inputProps, models, {})),
      };
    })();
    const useValues = createUseBindingState(resolved.reads.map(([key]) => key));
    for (const [name] of resolved.input)
      if (
        name === 'imperative' ||
        resolved.reads.some(([key]) => key === name) ||
        Object.hasOwn(resolved.write, name)
      )
        throw new Error(`holo.inputProps: "${name}" is a generated prop.`);
    return memoWithRef(function HoloResolved({ ownProps, owner }: BoundInput) {
      const store = useStore();
      const input = resolved.input.map(([name]) =>
        Object.hasOwn(staticProps, name) ? staticProps[name] : ownProps[name],
      );
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
      const lease = useMemo(
        () => ({ release: undefined as (() => void) | undefined }),
        [store, models, resolved],
      );
      // Child useImperativeHandle publishes before this parent layout effect.
      // Install event delivery before model resource activation can publish events.
      useCommitEffect(() => {
        if (owner.current && owner.current.lease !== lease) owner.current.close();
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
            lease.release = acquireResources(store, modelResources);
          }
          owner.current = { lease, close };
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
          closed: false,
          revision: 0,
          previous: undefined as readonly unknown[] | undefined,
        }),
        [lease],
      );
      const close = () => {
        if (lifetime.closed) return;
        lifetime.closed = true;
        lifetime.revision++;
        const release = lease.release;
        lease.release = undefined;
        try {
          release?.();
        } catch (error) {
          report(error);
        }
        if (owner.current?.lease === lease) owner.current = undefined;
      };
      useEffect(() => {
        lifetime.revision++;
        return () => {
          const revision = ++lifetime.revision;
          // StrictMode cleanup/setup is one logical owner; real cleanup closes it.
          queueMicrotask(() => {
            if (lifetime.revision !== revision) return;
            close();
          });
        };
      }, [lifetime]);
      useEffect(() => {
        const previous = lifetime.previous;
        lifetime.previous = input;
        resolved.input.forEach(([, target], index) => {
          if (previous && Object.is(previous[index], input[index])) return;
          try {
            const result = Reflect.apply(store.set, store, [target, input[index]]);
            if (result && typeof (result as PromiseLike<unknown>).then === 'function')
              void Promise.resolve(result).catch(report);
          } catch (error) {
            report(error);
          }
        });
      });
      return createElement(RenderedView, {
        ...ownProps,
        ...staticProps,
        ...values,
        ...callbacks,
        ...(hasImperative ? { imperative: handle } : {}),
      });
    });
  }
  const Connected = memoWithRef(function HoloView(ownProps: RecordValue) {
    const store = useStore();
    const owner = useRef<Owner['current']>(undefined);
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
    let node = cache;
    const identities = selections.map((selection) =>
      modelIdentity in selection
        ? (selection as ModelAtom<object>)[modelIdentity].entry(store.get)
        : selection,
    );
    // Both weak keys matter: model values keep Suspense retries stable; registry
    // entries distinguish keys/generations even if factories return one object.
    for (const model of [...Object.values(models), ...identities]) {
      const next = (node.next ??= new WeakMap());
      let child = next.get(model as object);
      if (!child) {
        child = {};
        next.set(model as object, child);
      }
      node = child;
    }
    const Resolved = (node.view ??= bind(models, selections));
    return createElement(Resolved, { ownProps, owner });
  });
  const name =
    typeof config.view === 'string'
      ? config.view
      : (config.view.displayName ?? config.view.name ?? 'View');
  Connected.displayName = `holo(${name})`;
  return Connected;
}

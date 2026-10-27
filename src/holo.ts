'use client';

import {
  connectView,
  type HoloViewConfig,
  type HoloViewComponent,
  type ViewRuntimeConfig,
} from './holo-view.js';
import { memoWithRef } from './react-compat.js';

import { useAtomValue, useStore, type Atom, type WritableAtom } from 'jotai';
import { bindSources, isBinding, type Binding } from './binding.js';
import { createStateBindingAtom } from './state-binding-atom.js';
import { createUseBindingState } from './binding-state.js';
import {
  createElement,
  memo,
  useMemo,
  type ComponentPropsWithRef,
  type ElementType,
  type NamedExoticComponent,
} from 'react';
import { createCageAtom, useHoloCage, type HoloCage } from './holo-cage.js';
import {
  bindModel,
  type ModelInputs,
  type ModelRuntimeConfig,
  type ModelSource,
  type ModelValue,
} from './model-binding.js';

type ValueAt<Props, Key extends PropertyKey> = Props extends unknown
  ? Key extends keyof Props
    ? Props[Key]
    : never
  : never;
type BranchAccepts<Whole, Branch, Key extends PropertyKey> = Branch extends unknown
  ? [ValueAt<Whole, Key>] extends [ValueAt<Branch, Key>]
    ? true
    : false
  : never;
export type BindingKeys<Props, Keys extends keyof Props = keyof Props> = {
  [Key in Keys]-?: false extends BranchAccepts<Props, Props, Key> ? never : Key;
}[Keys];
type ActionBinding<Callback> =
  NonNullable<Callback> extends (...args: infer Args) => infer Result
    ? WritableAtom<unknown, Args, Result>
    : never;
type ResolvedProp<Value> = Value extends PromiseLike<unknown> ? never : Value;
export type OwnProps<Props, Keys extends PropertyKey> = Props extends unknown
  ? Omit<Props, Keys>
  : never;
type Inputs<Props, StateKeys, ActionKeys> = OwnProps<
  Props,
  Extract<StateKeys | ActionKeys, PropertyKey>
>;

type ReadableBinding<Value> = Atom<Value> | Binding<Atom<Value>>;

export type HoloConfig<
  Core extends ElementType,
  StateKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  ActionKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
> = {
  core: Core;
  state?: {
    [Key in StateKeys]: ReadableBinding<
      | NoInfer<ResolvedProp<ComponentPropsWithRef<NoInfer<Core>>[Key]>>
      | PromiseLike<NoInfer<ResolvedProp<ComponentPropsWithRef<NoInfer<Core>>[Key]>>>
    >;
  };
  actions?: {
    [Key in ActionKeys]: Key extends StateKeys
      ? never
      :
          | ActionBinding<ComponentPropsWithRef<NoInfer<Core>>[Key]>
          | Binding<ActionBinding<ComponentPropsWithRef<NoInfer<Core>>[Key]>>;
  };
  bindProps?: {
    [Key in StaticKeys]: Key extends StateKeys | ActionKeys
      ? never
      : NoInfer<ComponentPropsWithRef<NoInfer<Core>>[Key]>;
  };
  cage?: HoloCage<Inputs<ComponentPropsWithRef<NoInfer<Core>>, StateKeys, ActionKeys>>;
};

export type HoloModelConfig<
  Core extends ElementType,
  Source extends ModelSource,
  StateKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  ActionKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
> = Omit<HoloConfig<Core, StateKeys, ActionKeys, StaticKeys>, 'state' | 'actions' | 'cage'> & {
  model: Source;
  state?:
    | HoloConfig<Core, StateKeys, ActionKeys, StaticKeys>['state']
    | ((
        model: ModelValue<Source>,
      ) => NonNullable<HoloConfig<Core, StateKeys, ActionKeys, StaticKeys>['state']>);
  actions?:
    | HoloConfig<Core, StateKeys, ActionKeys, StaticKeys>['actions']
    | ((
        model: ModelValue<Source>,
      ) => NonNullable<HoloConfig<Core, StateKeys, ActionKeys, StaticKeys>['actions']>);
  cage?:
    | HoloCage<
        Inputs<ComponentPropsWithRef<NoInfer<Core>>, StateKeys, ActionKeys> & ModelInputs<Source>
      >
    | ((
        model: ModelValue<Source>,
      ) => HoloCage<
        Inputs<ComponentPropsWithRef<NoInfer<Core>>, StateKeys, ActionKeys> & ModelInputs<Source>
      >);
};

/** Connect native atoms and named model selections to an ordinary View. */
export function holo<
  View extends ElementType,
  Sources extends Record<string, ModelSource> = {},
  ReadKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  WriteKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
>(
  config: HoloViewConfig<View, Sources, ReadKeys, WriteKeys, StaticKeys>,
): HoloViewComponent<View, Sources, ReadKeys, WriteKeys, StaticKeys>;
/** Declare once per model lifetime. Cores receive ordinary React props. */
export function holo<
  Core extends ElementType,
  Source extends ModelSource,
  StateKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  ActionKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
>(
  config: HoloModelConfig<Core, Source, StateKeys, ActionKeys, StaticKeys>,
): NamedExoticComponent<
  OwnProps<ComponentPropsWithRef<NoInfer<Core>>, StateKeys | ActionKeys | StaticKeys> &
    ModelInputs<Source>
>;
export function holo<
  Core extends ElementType,
  StateKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  ActionKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
>(
  config: HoloConfig<Core, StateKeys, ActionKeys, StaticKeys>,
): NamedExoticComponent<
  OwnProps<ComponentPropsWithRef<NoInfer<Core>>, StateKeys | ActionKeys | StaticKeys>
>;
export function holo(config: RuntimeConfig | ModelRuntimeConfig | ViewRuntimeConfig): unknown {
  if ('view' in config) return connectView(config);
  if ('model' in config)
    return bindModel(config, (resolved) => Reflect.apply(holo, undefined, [resolved]));
  const states = Object.entries(config.state ?? {});
  const actions = Object.entries(config.actions ?? {});
  const entries = [...states, ...actions];
  if (!entries.some(([, target]) => isBinding(target))) {
    return connect(config as ResolvedConfig);
  }
  return bindSources(entries, connect(config as ResolvedConfig, true));
}

type RuntimeConfig = {
  core: ElementType;
  state?: Record<string, Atom<unknown> | Binding<Atom<unknown>>>;
  actions?: Record<
    string,
    WritableAtom<unknown, never[], unknown> | Binding<WritableAtom<unknown, never[], unknown>>
  >;
  bindProps?: Record<string, unknown>;
  cage?: HoloCage<never>;
};
type ResolvedConfig = {
  core: ElementType;
  state?: Record<string, Atom<unknown>>;
  actions?: Record<string, WritableAtom<unknown, never[], unknown>>;
  bindProps?: Record<string, unknown>;
  cage?: HoloCage<never>;
};

type ResolvedEntries = readonly (readonly [string, Atom<unknown>])[];
type AdaptedProps = { ownProps: Record<string, unknown>; resolved: ResolvedEntries };

function connect(
  { core, state = {}, actions = {}, bindProps = {}, cage }: ResolvedConfig,
  adapted = false,
) {
  const states = Object.entries(state);
  const writes = Object.entries(actions);
  const staticProps = { ...bindProps };
  const boundKeys = new Set<string>();
  for (const key of [...Object.keys(state), ...Object.keys(actions), ...Object.keys(bindProps)]) {
    if (boundKeys.has(key))
      throw new Error(`holo: prop "${key}" is configured in more than one section.`);
    boundKeys.add(key);
  }
  const valuesAtom = adapted ? undefined : createStateBindingAtom(states);
  const useBindingState = adapted ? createUseBindingState(states.map(([key]) => key)) : undefined;
  const Core = typeof core === 'string' ? core : memo(core);
  const name = typeof core === 'string' ? core : (core.displayName ?? core.name ?? 'Core');

  const emptyValues: Record<string, unknown> = {};
  function useCoreElement(
    ownProps: Record<string, unknown>,
    values: Record<string, unknown>,
    targets: readonly (readonly [string, Atom<unknown>])[] = writes,
  ) {
    const store = useStore();
    const callbacks = useMemo(
      () =>
        Object.fromEntries<unknown>(
          targets.map(([key, target]) => [
            key,
            (...args: unknown[]): unknown => Reflect.apply(store.set, store, [target, ...args]),
          ]),
        ),
      [store, ...targets.map(([, target]) => target)],
    );
    return createElement(Core, { ...ownProps, ...staticProps, ...values, ...callbacks });
  }
  function HoloWithState(ownProps: Record<string, unknown>) {
    const values = useAtomValue(valuesAtom!);
    return useCoreElement(ownProps, values);
  }
  function HoloWithoutState(ownProps: Record<string, unknown>) {
    return useCoreElement(ownProps, emptyValues);
  }
  function HoloAdapted(ownProps: Record<string, unknown>) {
    const { ownProps: inputs, resolved } = ownProps as AdaptedProps;
    return useCoreElement(inputs, emptyValues, resolved);
  }
  function HoloAdaptedState(ownProps: Record<string, unknown>) {
    const { ownProps: inputs, resolved } = ownProps as AdaptedProps;
    const reads = resolved.slice(0, states.length);
    const values = useBindingState!(reads);
    return useCoreElement(inputs, values, resolved.slice(states.length));
  }
  const Bound = memoWithRef(
    adapted
      ? states.length
        ? HoloAdaptedState
        : HoloAdapted
      : states.length
        ? HoloWithState
        : HoloWithoutState,
  );
  Bound.displayName = `holo(${name})`;
  if (!cage || !Object.values(cage).some((callback) => typeof callback === 'function'))
    return Bound;

  const cageAtom = createCageAtom({ ...cage });
  const outputs = new Set([...Object.keys(state), ...Object.keys(actions)]);
  const WithCage = memoWithRef(function HoloWithCage(renderProps: Record<string, unknown>) {
    const ownProps = adapted ? (renderProps as AdaptedProps).ownProps : renderProps;
    const inputs = Object.fromEntries<unknown>(
      Object.entries({ ...ownProps, ...staticProps }).filter(([key]) => !outputs.has(key)),
    );
    useHoloCage(cageAtom, inputs);
    return createElement(Bound, renderProps);
  });
  WithCage.displayName = `holo(${name})`;
  return WithCage;
}

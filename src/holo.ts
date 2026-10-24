'use client';

import { useAtomValue, useStore, type Atom, type WritableAtom } from 'jotai';
import { createStateBindingAtom } from './state-binding-atom.js';
import {
  createElement,
  memo,
  useMemo,
  type ComponentPropsWithRef,
  type ElementType,
  type NamedExoticComponent,
} from 'react';
import { createCageAtom, useHoloCage, type HoloCage } from './holo-cage.js';

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
type BindingKeys<Props, Keys extends keyof Props = keyof Props> = {
  [Key in Keys]-?: false extends BranchAccepts<Props, Props, Key> ? never : Key;
}[Keys];
type ActionBinding<Callback> =
  NonNullable<Callback> extends (...args: infer Args) => infer Result
    ? WritableAtom<unknown, Args, Result>
    : never;
type ResolvedProp<Value> = Value extends PromiseLike<unknown> ? never : Value;
type OwnProps<Props, Keys extends PropertyKey> = Props extends unknown ? Omit<Props, Keys> : never;
type Inputs<Props, StateKeys, ActionKeys> = OwnProps<
  Props,
  Extract<StateKeys | ActionKeys, PropertyKey>
>;

/** Declare once per model lifetime. Cores receive ordinary React props. */
export function holo<
  Core extends ElementType,
  StateKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  ActionKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
>(config: {
  core: Core;
  state?: {
    [Key in StateKeys]: Atom<
      | NoInfer<ResolvedProp<ComponentPropsWithRef<NoInfer<Core>>[Key]>>
      | PromiseLike<NoInfer<ResolvedProp<ComponentPropsWithRef<NoInfer<Core>>[Key]>>>
    >;
  };
  actions?: {
    [Key in ActionKeys]: Key extends StateKeys
      ? never
      : ActionBinding<ComponentPropsWithRef<NoInfer<Core>>[Key]>;
  };
  props?: {
    [Key in StaticKeys]: Key extends StateKeys | ActionKeys
      ? never
      : NoInfer<ComponentPropsWithRef<NoInfer<Core>>[Key]>;
  };
  cage?: HoloCage<Inputs<ComponentPropsWithRef<NoInfer<Core>>, StateKeys, ActionKeys>>;
}): NamedExoticComponent<
  OwnProps<ComponentPropsWithRef<NoInfer<Core>>, StateKeys | ActionKeys | StaticKeys>
>;
export function holo({
  core,
  state = {},
  actions = {},
  props = {},
  cage,
}: {
  core: ElementType;
  state?: Record<string, Atom<unknown>>;
  actions?: Record<string, WritableAtom<unknown, never[], unknown>>;
  props?: Record<string, unknown>;
  cage?: HoloCage<never>;
}) {
  const states = Object.entries(state);
  const writes = Object.entries(actions);
  const staticProps = { ...props };
  const boundKeys = new Set<string>();
  for (const key of [...Object.keys(state), ...Object.keys(actions), ...Object.keys(props)]) {
    if (boundKeys.has(key))
      throw new Error(`holo: prop "${key}" is configured in more than one section.`);
    boundKeys.add(key);
  }
  const valuesAtom = createStateBindingAtom(states);
  const Core = typeof core === 'string' ? core : memo(core);
  const name = typeof core === 'string' ? core : (core.displayName ?? core.name ?? 'Core');

  const emptyValues: Record<string, unknown> = {};
  function useCoreElement(ownProps: Record<string, unknown>, values: Record<string, unknown>) {
    const store = useStore();
    const callbacks = useMemo(
      () =>
        Object.fromEntries<unknown>(
          writes.map(([key, target]) => [
            key,
            (...args: unknown[]): unknown => Reflect.apply(store.set, store, [target, ...args]),
          ]),
        ),
      [store],
    );
    return createElement(Core, { ...ownProps, ...staticProps, ...values, ...callbacks });
  }
  function HoloWithState(ownProps: Record<string, unknown>) {
    const values = useAtomValue(valuesAtom);
    return useCoreElement(ownProps, values);
  }
  function HoloWithoutState(ownProps: Record<string, unknown>) {
    return useCoreElement(ownProps, emptyValues);
  }
  const Bound = memo(states.length ? HoloWithState : HoloWithoutState);
  Bound.displayName = `holo(${name})`;
  if (!cage || !Object.values(cage).some((callback) => typeof callback === 'function'))
    return Bound;

  const cageAtom = createCageAtom({ ...cage });
  const outputs = new Set([...Object.keys(state), ...Object.keys(actions)]);
  const WithCage = memo(function HoloWithCage(ownProps: Record<string, unknown>) {
    const inputs = Object.fromEntries<unknown>(
      Object.entries({ ...ownProps, ...staticProps }).filter(([key]) => !outputs.has(key)),
    );
    useHoloCage(cageAtom, inputs);
    return createElement(Bound, ownProps);
  });
  WithCage.displayName = `holo(${name})`;
  return WithCage;
}

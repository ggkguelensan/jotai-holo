'use client';

import { memoWithRef } from './react-compat.js';

import { createElement, memo, useMemo, type ComponentType } from 'react';

const binding = Symbol('holo.binding');

export type BindingSource = { readonly useValue: () => unknown };
export type Binding<Target> = {
  readonly [binding]: {
    readonly source: BindingSource;
    readonly select: (value: unknown) => Target;
  };
};

/** Internal adapter protocol. Descriptors hold definitions, never resolved models. */
export function createBinding<Model, Target>(
  source: BindingSource,
  select: (model: Model) => Target,
): Binding<Target> {
  return { [binding]: { source, select: (value) => select(value as Model) } };
}

export function isBinding(value: unknown): value is Binding<unknown> {
  return typeof value === 'object' && value !== null && binding in value;
}

/** Sources and resolver hook order are captured once when holo is declared. */
export function bindSources<Target>(
  entries: readonly (readonly [string, Target | Binding<Target>])[],
  Connected: ComponentType<{
    resolved: readonly (readonly [string, Target])[];
    ownProps: Record<string, unknown>;
  }>,
) {
  const sources = [
    ...new Set(
      entries.flatMap(([, target]) => (isBinding(target) ? [target[binding].source] : [])),
    ),
  ];
  const resolve = (values: readonly unknown[]) =>
    entries.map(
      ([key, target]) =>
        [
          key,
          isBinding(target)
            ? (target[binding].select(values[sources.indexOf(target[binding].source)]) as Target)
            : target,
        ] as const,
    );
  type Props = { values: readonly unknown[]; ownProps: Record<string, unknown> };
  const Leaf = memo(function HoloBinding({ values, ownProps }: Props) {
    const resolved = useMemo(() => resolve(values), [values]);
    return createElement(Connected, { resolved, ownProps });
  });
  const Resolver = sources.reduceRight<ComponentType<Props>>((Next, source) => {
    return memo(function HoloSource({ values, ownProps }: Props) {
      const value = source.useValue();
      const resolved = useMemo(() => [...values, value], [values, value]);
      return createElement(Next, { values: resolved, ownProps });
    });
  }, Leaf);
  const empty: readonly unknown[] = [];
  return memoWithRef(function HoloSources(ownProps: Record<string, unknown>) {
    return createElement(Resolver, { values: empty, ownProps });
  });
}

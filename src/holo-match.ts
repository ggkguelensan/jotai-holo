'use client';

import { memoWithRef } from './react-compat.js';

import { useAtomValue, type Atom } from 'jotai';
import {
  createElement,
  memo,
  type ComponentPropsWithRef,
  type ElementType,
  type NamedExoticComponent,
} from 'react';

// Intersect component call signatures before extracting props. A zero-argument
// View has unknown props, which would erase required inputs in a props union.
type BranchSignature<View> = View extends ElementType
  ? (props: ComponentPropsWithRef<View>) => void
  : never;
type BranchProps<Cases, Fallback> =
  BranchSignature<Cases[keyof Cases] | Fallback> extends (props: infer Props) => void
    ? Props
    : never;
export function holoMatch<
  Value extends string | number,
  const Cases extends Partial<Record<NoInfer<Value>, ElementType>>,
  Fallback extends ElementType = never,
>(
  config: {
    source: Atom<Value | PromiseLike<Value>>;
    cases: Cases & Record<Exclude<keyof Cases, Value>, never>;
    fallback?: Fallback;
  } & ([Value] extends [keyof Cases] ? {} : { fallback: Fallback }),
): NamedExoticComponent<BranchProps<Cases, Fallback>>;
export function holoMatch({
  source,
  cases,
  fallback,
}: {
  source: Atom<string | number | PromiseLike<string | number>>;
  cases: Record<string, ElementType>;
  fallback?: ElementType;
}) {
  const views = new Map(Object.entries(cases).map(([key, view]) => [key, memoView(view)]));
  const Fallback = fallback ? memoView(fallback) : undefined;
  return memoWithRef(function HoloMatch(props: Record<string, unknown>) {
    const value = useAtomValue(source);
    const view = views.get(String(value));
    if (!view && !Fallback) throw new Error(`holoMatch: no case for "${String(value)}".`);
    return createElement((view ?? Fallback)!, {
      ...props,
      key: view ? `case:${String(value)}` : 'fallback',
    });
  });
}

function memoView(view: ElementType) {
  return typeof view === 'string' ? view : memo(view);
}

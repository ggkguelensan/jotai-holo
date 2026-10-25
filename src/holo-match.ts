'use client';

import { useAtomValue, type Atom } from 'jotai';
import {
  createElement,
  memo,
  type ComponentPropsWithRef,
  type ElementType,
  type NamedExoticComponent,
} from 'react';

type Intersect<Union> = (Union extends unknown ? (value: Union) => void : never) extends (
  value: infer Value,
) => void
  ? Value
  : never;
type BranchProps<Cases, Fallback> = Intersect<
  ComponentPropsWithRef<Extract<Cases[keyof Cases] | Fallback, ElementType>>
>;
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
  const views = new Map(Object.entries(cases));
  return memo(function HoloMatch(props: Record<string, unknown>) {
    const value = useAtomValue(source);
    const view = views.get(String(value));
    if (!view && !fallback) throw new Error(`holoMatch: no case for "${String(value)}".`);
    return createElement((view ?? fallback)!, {
      ...props,
      key: view ? `case:${String(value)}` : 'fallback',
    });
  });
}

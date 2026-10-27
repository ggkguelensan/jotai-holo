'use client';

import { memoWithRef } from './react-compat.js';

import { useAtomValue, type Atom } from 'jotai';
import {
  createElement,
  type ComponentPropsWithRef,
  type ComponentType,
  type ElementType,
  type Key,
  type NamedExoticComponent,
} from 'react';
import { holo, type HoloConfig, type BindingKeys, type OwnProps } from './holo.js';

type RowProps<View extends ElementType, M, S, A, P> = OwnProps<
  ComponentPropsWithRef<NoInfer<View>>,
  Extract<M | S | A | P, PropertyKey>
>;
export function holoList<
  View extends ElementType,
  Item,
  MappedKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  ReadKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  WriteKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
>(
  config: HoloConfig<View, {}, ReadKeys, WriteKeys, StaticKeys> & {
    source: Atom<readonly Item[] | PromiseLike<readonly Item[]>>;
    getKey: (item: Item, index: number) => Key;
    mapItem: (
      item: Item,
      index: number,
    ) => {
      [Key in MappedKeys]: Key extends ReadKeys | WriteKeys | StaticKeys
        ? never
        : NoInfer<ComponentPropsWithRef<NoInfer<View>>[Key]>;
    };
    empty?: ComponentType<RowProps<View, MappedKeys, ReadKeys, WriteKeys, StaticKeys>>;
  },
): NamedExoticComponent<RowProps<View, MappedKeys, ReadKeys, WriteKeys, StaticKeys>>;
export function holoList(config: {
  view: ElementType;
  source: Atom<readonly unknown[] | PromiseLike<readonly unknown[]>>;
  getKey: (item: never, index: number) => Key;
  mapItem: (item: never, index: number) => Record<string, unknown>;
  empty?: ElementType;
}) {
  const { source, getKey, mapItem, empty } = config;
  const Row: ComponentType<Record<string, unknown>> = Reflect.apply(holo, undefined, [config]);
  return memoWithRef(function HoloList(props: Record<string, unknown>) {
    const items = useAtomValue(source);
    if (!items.length) return empty ? createElement(empty, props) : null;
    const keys = new Set<string>();
    return items.map((item, index) => {
      const key = getKey(item as never, index);
      const id = String(key);
      if (keys.has(id)) throw new Error(`holoList: duplicate key "${id}".`);
      keys.add(id);
      const mapped = mapItem(item as never, index);
      for (const section of ['read', 'write', 'props'] as const) {
        const bound = Reflect.get(config, section) as Record<string, unknown> | undefined;
        if (bound)
          for (const name of Object.keys(mapped)) {
            if (Object.hasOwn(bound, name))
              throw new Error(`holoList: mapped prop "${name}" is also bound in ${section}.`);
          }
      }
      return createElement(Row, { ...props, ...mapped, key });
    });
  });
}

'use client';

import { useAtomValue, type Atom } from 'jotai';
import {
  createElement,
  memo,
  type ComponentPropsWithRef,
  type ComponentType,
  type ElementType,
  type Key,
  type NamedExoticComponent,
} from 'react';
import { holo, type HoloConfig, type BindingKeys, type OwnProps } from './holo.js';

type RowProps<Core extends ElementType, M, S, A, P> = OwnProps<
  ComponentPropsWithRef<NoInfer<Core>>,
  Extract<M | S | A | P, PropertyKey>
>;
export function holoList<
  Core extends ElementType,
  Item,
  MappedKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  StateKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  ActionKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
>(
  config: HoloConfig<Core, StateKeys, ActionKeys, StaticKeys> & {
    source: Atom<readonly Item[] | PromiseLike<readonly Item[]>>;
    getKey: (item: Item, index: number) => Key;
    mapItem: (
      item: Item,
      index: number,
    ) => {
      [Key in MappedKeys]: Key extends StateKeys | ActionKeys | StaticKeys
        ? never
        : NoInfer<ComponentPropsWithRef<NoInfer<Core>>[Key]>;
    };
    empty?: ComponentType<RowProps<Core, MappedKeys, StateKeys, ActionKeys, StaticKeys>>;
  },
): NamedExoticComponent<RowProps<Core, MappedKeys, StateKeys, ActionKeys, StaticKeys>>;
export function holoList(config: {
  core: ElementType;
  source: Atom<readonly unknown[] | PromiseLike<readonly unknown[]>>;
  getKey: (item: never, index: number) => Key;
  mapItem: (item: never, index: number) => Record<string, unknown>;
  empty?: ElementType;
}) {
  const { source, getKey, mapItem, empty } = config;
  const Row: ComponentType<Record<string, unknown>> = Reflect.apply(holo, undefined, [config]);
  return memo(function HoloList(props: Record<string, unknown>) {
    const items = useAtomValue(source);
    if (!items.length) return empty ? createElement(empty, props) : null;
    const keys = new Set<string>();
    return items.map((item, index) => {
      const key = getKey(item as never, index);
      const id = String(key);
      if (keys.has(id)) throw new Error(`holoList: duplicate key "${id}".`);
      keys.add(id);
      const mapped = mapItem(item as never, index);
      for (const section of ['state', 'actions', 'bindProps'] as const) {
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

'use client';

import type { ComponentPropsWithRef, ElementType } from 'react';
import {
  connectView,
  type HoloConfig,
  type HoloViewComponent,
  type ViewRuntimeConfig,
} from './holo-view.js';
import type { BindingKeys, ModelSource } from './holo-types.js';
export type { HoloConfig } from './holo-view.js';
export type { BindingKeys, OwnProps } from './holo-types.js';

/** Declare outside render. Models select instances; View receives ordinary props. */
export function holo<
  View extends ElementType,
  Sources extends Record<string, ModelSource> = {},
  ReadKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  WriteKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
>(
  config: HoloConfig<View, Sources, ReadKeys, WriteKeys, StaticKeys>,
): HoloViewComponent<View, Sources, ReadKeys, WriteKeys, StaticKeys>;
export function holo(config: ViewRuntimeConfig): unknown {
  return connectView(config);
}

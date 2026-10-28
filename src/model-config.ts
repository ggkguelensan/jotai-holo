import type { Resource } from './resource.js';

export type ModelBlueprint = {
  create: (initial: any) => object;
  initial?: unknown;
  retainTime?: number;
  resources?: (model: any) => readonly Resource[];
};
/** Flatten compositions without wrapping a registry inside another registry. */
export const modelBlueprints = new WeakMap<object, ModelBlueprint>();

import type { ApplicableModelModifier } from './model-modifier.js';
import type { ModelSource } from './model-composition.js';
import type { ModelDefinition } from './model-registry.js';

/** Compose model modifiers in reading order. */
export function pipe<Model extends object, Initial>(
  value: ModelSource<Model, Initial>,
  first: ApplicableModelModifier<NoInfer<Model>, NoInfer<Initial>>,
  ...rest: ApplicableModelModifier<NoInfer<Model>, NoInfer<Initial>>[]
): ModelDefinition<Model, Initial>;
export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(value: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(value: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
export function pipe<A, B, C, D, E>(
  value: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  value: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): F;
/** Model modifiers preserve the record type for arbitrarily long chains. */
export function pipe<Model extends object, Initial>(
  value: ModelSource<Model, Initial>,
  first: (source: ModelSource<Model, Initial>) => ModelDefinition<Model, Initial>,
  ...rest: ((source: ModelDefinition<Model, Initial>) => ModelDefinition<Model, Initial>)[]
): ModelDefinition<Model, Initial>;
export function pipe(value: unknown, ...modifiers: ((value: any) => unknown)[]): unknown {
  return modifiers.reduce((current, modify) => modify(current), value);
}

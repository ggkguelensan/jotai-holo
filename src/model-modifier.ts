import type { ModelSource } from './model-composition.js';
import type { ModelDefinition } from './model-registry.js';

// Type-only evidence: built-in modifiers preserve records, unlike arbitrary pipe steps.
declare const preservesModel: unique symbol;
export type ModelModifierTag = { readonly [preservesModel]: true };
export type ApplicableModelModifier<Model extends object, Initial> =
  | (ModelModifierTag & ((source: ModelSource<Model, Initial>) => ModelDefinition<object, any>))
  | (<Selected extends Model, Input extends Initial>(
      source: ModelSource<Selected, Input>,
    ) => ModelDefinition<Selected, Input>);

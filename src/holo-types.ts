import type { Atom } from 'jotai/vanilla';
import type { modelDefinition } from './model-protocol.js';

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
export type BindingKeys<Props, Keys extends keyof Props = keyof Props> = {
  [Key in Keys]-?: false extends BranchAccepts<Props, Props, Key> ? never : Key;
}[Keys];
export type OwnProps<Props, Keys extends PropertyKey> = Props extends unknown
  ? Omit<Props, Keys>
  : never;
export type ModelSource = Atom<object> | ((...args: never[]) => Atom<object>);
export type ModelValue<Source> =
  Source extends Atom<infer Model>
    ? Awaited<Model>
    : Source extends (...args: never[]) => Atom<infer Model>
      ? Awaited<Model>
      : never;
export type ModelInputs<Source> = Source extends { readonly [modelDefinition]: true }
  ? {}
  : Source extends (props: infer Props) => Atom<object>
    ? Props
    : {};

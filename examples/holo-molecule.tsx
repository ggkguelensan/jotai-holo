import { createElement, memo, type ComponentType } from 'react';
import { useMolecule, type MoleculeOrInterface } from 'bunshi/react';

/** Example adapter: cache each binding for the lifetime of its model. */
export function holoMolecule<Model extends object, Props extends object>(
  target: MoleculeOrInterface<Model>,
  bind: (model: Model) => ComponentType<Props>,
) {
  const bindings = new WeakMap<Model, ComponentType<Props>>();
  return memo(function HoloMolecule(props: Props) {
    const model = useMolecule(target);
    let Connected = bindings.get(model);
    if (!Connected) {
      Connected = bind(model);
      bindings.set(model, Connected);
    }
    return createElement(Connected, props);
  });
}

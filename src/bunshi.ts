'use client';

import { useMolecule, type MoleculeOrInterface } from 'bunshi/react';
import type { Atom } from 'jotai';
import { createBinding, type Binding, type BindingSource } from './binding.js';

/** Select atoms from one Bunshi model, shared by all bindings of this adapter in a holo. */
export function holoMolecule<Model>(target: MoleculeOrInterface<Model>) {
  const source: BindingSource = { useValue: () => useMolecule(target) };
  return function select<Target extends Atom<unknown>>(
    selector: (model: Model) => Target,
  ): Binding<Target> {
    return createBinding(source, selector);
  };
}

import { atom } from 'jotai';
import { type ComponentProps } from 'react';
import { molecule, moleculeInterface } from 'bunshi/react';
import { expectTypeOf, test } from 'vitest';
import { holo, actionAtom } from '../src/index.js';
import { holoMolecule } from '../src/bunshi.js';

const result = Promise.resolve('saved');
const Counter = molecule(() => ({
  $count: atom(0),
  $name: atom(Promise.resolve('Ada')),
  save: actionAtom((_get, _set, _id: number, _notify: boolean) => result),
}));
const counter = holoMolecule(Counter);
function View(_props: {
  count: number;
  name: string;
  onSave: (id: number, notify: boolean) => Promise<string>;
  title: string;
  initial: number;
}) {
  return null;
}

test('adapter preserves inferred model, promise state, action arguments/results and remaining public props', () => {
  const C = holo({
    core: View,
    state: {
      count: counter((m) => {
        expectTypeOf(m.$count).toEqualTypeOf<ReturnType<typeof atom<number>>>();
        return m.$count;
      }),
      name: counter((m) => m.$name),
    },
    actions: { onSave: counter((m) => m.save) },
    bindProps: { title: 'Fixed' },
    cage: {
      onChange(_get, _set, ctx) {
        expectTypeOf(ctx.props.initial).toEqualTypeOf<number>();
      },
    },
  });
  expectTypeOf<ComponentProps<typeof C>>().toEqualTypeOf<{ initial: number }>();
});

function _invalidContracts() {
  // @ts-expect-error Selectors must return atoms, not values.
  counter((m) => 1);
  // @ts-expect-error Model properties are inferred.
  counter((m) => m.$missing);
  // @ts-expect-error Async selectors are unsupported; return an async atom instead.
  counter(async (m) => m.$count);
  // @ts-expect-error Resolved state must match the View prop.
  holo({ core: View, state: { count: counter((m) => m.$name) } });
  // @ts-expect-error A readable atom cannot supply an action.
  holo({ core: View, actions: { onSave: counter(() => atom(() => 1)) } });
  // @ts-expect-error Callback arguments and results must match.
  holo({ core: View, actions: { onSave: counter((m) => m.$count) } });
  const C = holo({ core: View, state: { count: counter((m) => m.$count) } });
  // @ts-expect-error Remaining public props remain required.
  const missing = <C />;
  const contract = moleculeInterface<{ $count: ReturnType<typeof atom<number>> }>();
  const fromInterface = holoMolecule(contract);
  holo({ core: View, state: { count: fromInterface((m) => m.$count) } });
  return missing;
}

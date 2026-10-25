import { atom, type Atom } from 'jotai/vanilla';
import { expectTypeOf, test } from 'vitest';
import { actionAtom, bond, holoList, holoMatch, ion, prism, type Bond } from '../src/index.js';

test('operator types retain projected values and argument tuples', () => {
  const requested = actionAtom<[number]>();
  const prepared = bond({ trigger: requested, map: (value) => [value * 2, String(value)] });
  expectTypeOf(prepared).toEqualTypeOf<Bond<[number, string]>>();
  const $tuple = ion([atom(1), atom('a')]);
  expectTypeOf($tuple).toEqualTypeOf<Atom<[number, string]>>();
  const fields = prism(atom({ name: 'Ada', age: 20 }), {
    $name: (u) => u.name,
    $age: (u) => u.age,
  });
  expectTypeOf(fields.$age).toEqualTypeOf<Atom<number>>();
});

function invalidContracts() {
  const trigger = actionAtom<[number]>();
  const stringTarget = actionAtom((_get, _set, _value: string) => {});
  // @ts-expect-error No implicit clock can be selected without state or trigger.
  bond({});
  // @ts-expect-error Default trigger args must fit target args.
  bond({ trigger, yield: stringTarget });
  // @ts-expect-error Mapped args must fit target args.
  bond({ trigger, map: (value) => [value], yield: stringTarget });
  // @ts-expect-error Guards are synchronous.
  bond({ trigger, guard: async () => true });
  // @ts-expect-error Maps are synchronous argument tuples.
  bond({ trigger, map: async (value) => [value] });
  const $status = atom<'ready' | 'loading'>('ready');
  const View = (_props: { title: string }) => null;
  // @ts-expect-error Missing case needs a fallback.
  holoMatch({ source: $status, cases: { ready: View } });
  // @ts-expect-error Unknown case is rejected.
  holoMatch({ source: $status, cases: { ready: View, loading: View, extra: View } });
  const Match = holoMatch({ source: $status, cases: { ready: View, loading: View } });
  const valid = <Match title="title" />;
  // @ts-expect-error Required branch input remains public.
  const invalid = <Match />;
  const List = holoList({
    source: atom([1]),
    getKey: (n) => n,
    mapItem: (n) => ({ n }),
    core: (_props: { n: number; title: string }) => null,
  });
  const list = <List title="title" />;
  // @ts-expect-error Mapped input is no longer public.
  const invalidList = <List title="title" n={1} />;
  // @ts-expect-error A stable row key is required.
  holoList({ source: atom([1]), mapItem: (n) => ({ n }), core: (_props: { n: number }) => null });
  holoList({
    source: atom([1]),
    getKey: (n) => n,
    // @ts-expect-error A prop cannot be both mapped and bound.
    mapItem: (n) => ({ n }),
    state: { n: atom(1) },
    core: (_props: { n: number }) => null,
  });
  return [valid, invalid, list, invalidList];
}
void invalidContracts;

import { atom, type Atom } from 'jotai/vanilla';

type Key = string | number | boolean;
type ValueOf<Target> = Target extends Atom<infer Value> ? Value : never;

/** Read only the matched branch. Constructing branches does not evaluate them. */
export function matchAtom<
  Value extends Key,
  const Cases extends Partial<Record<`${NoInfer<Value>}`, Atom<unknown>>>,
  Fallback extends Atom<unknown> = never,
>(
  source: Atom<Value>,
  cases: Cases & { [Name in keyof Cases]-?: Atom<unknown> } & Record<
      Exclude<keyof Cases, `${Value}` | Value>,
      never
    >,
  ...options: [`${Value}`] extends [`${Extract<keyof Cases, string | number>}`]
    ? [options?: { fallback: Fallback }]
    : [options: { fallback: Fallback }]
): Atom<ValueOf<Cases[keyof Cases] | Fallback>> {
  return atom((get) => {
    const key = String(get(source));
    const target = Object.hasOwn(cases, key)
      ? (cases as Record<string, Atom<unknown>>)[key]
      : options[0]?.fallback;
    if (!target) throw new Error(`matchAtom: no case for "${key}".`);
    return get(target) as ValueOf<Cases[keyof Cases] | Fallback>;
  });
}

import { atom, type Atom } from 'jotai/vanilla';
import { unwrap } from 'jotai/vanilla/utils';

// A private sentinel keeps a legitimate undefined value distinct from pending.
const PENDING = Symbol('holo.pending');
const pending = () => PENDING;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

/** One native atom owns each binding snapshot; Jotai owns subscriptions and promise state. */
export function createStateBindingAtom(bindings: readonly (readonly [string, Atom<unknown>])[]) {
  const readers = bindings.map(([key, target]) => ({
    key,
    target,
    resolved: unwrap(target, pending),
  }));
  const toProps = (values: readonly unknown[]) =>
    Object.fromEntries<unknown>(readers.map(({ key }, index) => [key, values[index]]));
  // A raw snapshot changes only when an input changes, not when unwrap learns its result.
  const rawAtom = atom((get) => readers.map(({ target }) => get(target)));
  const results = new WeakMap<
    readonly unknown[],
    Record<string, unknown> | Promise<Record<string, unknown>>
  >();
  return atom((get) => {
    // Keep the same result through Suspense retries for the same raw snapshot.
    const raw = get(rawAtom);
    // Also depend directly on sources: before the first commit Jotai must abort this
    // pending result when a source changes, even while intermediate atoms are unmounted.
    for (const { target } of readers) get(target);
    const cached = results.get(raw);
    if (cached) return cached;
    const values = readers.map(({ resolved }, index) =>
      isPromiseLike(raw[index]) ? get(resolved) : raw[index],
    );
    // Settled bindings stay synchronous, including a settled promise beside changed sync state.
    // Fail on any rejection, irrespective of binding order. No error wrapping/catching.
    const result = values.includes(PENDING) ? Promise.all(raw).then(toProps) : toProps(values);
    results.set(raw, result);
    return result;
  });
}

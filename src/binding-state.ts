'use client';

import { useAtomValueRaw, useStore, type Atom } from 'jotai';
import { useMemo } from 'react';
import { usePromise } from './react-compat.js';

type Entries = readonly (readonly [string, Atom<unknown>])[];
type Values = readonly unknown[];
type Props = Record<string, unknown>;
type Status = { state: 'pending' | 'fulfilled' | 'rejected'; value?: unknown; reason?: unknown };
function isPromise(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

/** Native raw hooks supply continuable promises, without a pending derived atom
 * retaining model atoms through dependencies on globally owned atoms. */
export function createUseBindingState(keys: readonly string[]) {
  type Node = {
    next?: WeakMap<Atom<unknown>, Node>;
    raw?: Values;
    result?: Props | Promise<Props>;
  };
  const roots = new WeakMap<ReturnType<typeof useStore>, Node>();
  const statuses = new WeakMap<PromiseLike<unknown>, Status>();
  const toProps = (values: Values) =>
    Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  const read = (store: ReturnType<typeof useStore>, entries: Entries, values: Values) => {
    let node: Node = roots.get(store) ?? {};
    roots.set(store, node);
    for (const [, target] of entries) {
      const next = (node.next ??= new WeakMap());
      let child = next.get(target);
      if (!child) {
        child = {};
        next.set(target, child);
      }
      node = child;
    }
    if (node.raw && node.raw.every((value, index) => Object.is(value, values[index])))
      return node.result!;
    let pending = false;
    const resolved = values.map((value) => {
      if (!isPromise(value)) return value;
      let status = statuses.get(value);
      if (!status) {
        status = { state: 'pending' };
        statuses.set(value, status);
        // Capture only this promise's status, never models, atoms or the tuple cache.
        const record = status;
        Promise.resolve(value).then(
          (result) => {
            record.state = 'fulfilled';
            record.value = result;
          },
          (reason) => {
            record.state = 'rejected';
            record.reason = reason;
          },
        );
      }
      if (status.state === 'rejected') throw status.reason;
      if (status.state === 'fulfilled') return status.value;
      pending = true;
      return undefined;
    });
    node.raw = values;
    return (node.result = pending ? Promise.all(values).then(toProps) : toProps(resolved));
  };
  const empty: Values = [];
  let useValues = (_entries: Entries): Values => empty;
  // Build a fixed chain of custom hooks once, not a hook loop during render.
  for (const index of keys.keys()) {
    const usePrevious = useValues;
    useValues = function useBindingValues(entries: Entries): Values {
      const previous = usePrevious(entries);
      const value = useAtomValueRaw(entries[index]![1]);
      return useMemo(() => [...previous, value], [previous, value]);
    };
  }
  return function useBindingState(entries: Entries) {
    const store = useStore();
    const values = useValues(entries);
    const result = read(store, entries, values);
    return isPromise(result) ? usePromise(result) : result;
  };
}

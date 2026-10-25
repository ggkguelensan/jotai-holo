import { atom, type createStore, type Atom, type Getter, type WritableAtom } from 'jotai/vanilla';
import {
  actionSource,
  createActionChannel,
  emitAction,
  enqueueAction,
  isActionSource,
  type ActionSource,
} from './action-source.js';
import { readSource, type AtomSource, type SourceValue } from './atom-source.js';
import { ion } from './ion.js';

type Store = ReturnType<typeof createStore>;
type Trigger = Atom<unknown>;
type TriggerArgs<T> =
  T extends ActionSource<infer Args> ? Args : T extends Atom<infer Value> ? [Value] : [];
type Inputs<S, T> = S extends AtomSource ? [SourceValue<S>, ...TriggerArgs<T>] : TriggerArgs<T>;
type Defaults<S, T> = S extends AtomSource ? [SourceValue<S>] : TriggerArgs<T>;
type Writable = WritableAtom<unknown, never[], unknown>;
type TargetArgs<T> = T extends WritableAtom<unknown, infer Args, unknown> ? Args : never;
export type BondOptions = { onError?: (error: unknown) => void };
export type Bond<Args extends readonly unknown[]> = Atom<Args | undefined> &
  ActionSource<Args> & {
    connect(store: Store, options?: BondOptions): () => void;
  };

type Config<Source, Clock, Target> = {
  state?: Source;
  trigger?: Clock;
  guard?: Atom<boolean> | ((...args: Inputs<Source, Clock>) => boolean);
  yield?: [Target] extends [undefined] ? never : Target | ((get: Getter) => Target);
};
type HasInput<Source, Clock> = Source extends undefined
  ? Clock extends undefined
    ? { state: AtomSource }
    : {}
  : {};
type Compatible<Target, Args extends readonly unknown[]> = Target extends Writable
  ? [...Args] extends TargetArgs<Target>
    ? {}
    : { yield: never }
  : {};
export function bond<
  const Source extends AtomSource | undefined = undefined,
  Clock extends Trigger | undefined = undefined,
  Target extends Writable = Writable,
>(
  config: Config<Source, Clock, Target> & {
    map: (...args: Inputs<Source, Clock>) => readonly [...TargetArgs<NoInfer<Target>>];
    yield: Target | ((get: Getter) => Target);
  } & HasInput<Source, Clock>,
): Bond<TargetArgs<Target>>;
export function bond<
  const Args extends readonly unknown[],
  const Source extends AtomSource | undefined = undefined,
  Clock extends Trigger | undefined = undefined,
>(
  config: Config<Source, Clock, undefined> & {
    map: (...args: Inputs<Source, Clock>) => readonly [...Args];
  } & HasInput<Source, Clock>,
): Bond<Args>;
export function bond<
  const Source extends AtomSource | undefined = undefined,
  Clock extends Trigger | undefined = undefined,
  Target extends Writable | undefined = undefined,
>(
  config: Config<Source, Clock, Target> & { map?: never } & HasInput<Source, Clock> &
    Compatible<Target, Defaults<Source, Clock>>,
): Bond<Defaults<Source, Clock>>;
export function bond(config: {
  state?: AtomSource;
  trigger?: Atom<unknown>;
  guard?: Atom<boolean> | ((...args: never[]) => boolean);
  map?: (...args: never[]) => readonly unknown[];
  yield?: Writable | ((get: Getter) => Writable);
}): unknown {
  const { state, trigger, guard, map } = config;
  if (!state && !trigger) throw new Error('bond: state or trigger is required.');
  const clock = trigger ?? ion(state!);
  const channel = createActionChannel<readonly unknown[]>();
  const $last = atom<readonly unknown[] | undefined>(undefined);
  const output = Object.assign(
    atom((get) => get($last)),
    { [actionSource]: channel },
  ) as Bond<readonly unknown[]>;
  const connections = new WeakMap<Store, Runtime>();
  output.connect = (store, options = {}) => {
    let runtime = connections.get(store);
    const owner = { ...options };
    if (!runtime) {
      runtime = { owners: new Set(), stop: () => {} };
      connections.set(store, runtime);
    }
    const current = runtime;
    current.owners.add(owner);
    if (current.owners.size === 1) {
      const evaluate = (args: readonly unknown[], publish = true) => {
        if (!current.owners.size) return;
        try {
          const data = state ? readSource(store.get, state) : undefined;
          const inputs = state ? [data, ...args] : args;
          const allowed = !guard
            ? true
            : typeof guard === 'function'
              ? Reflect.apply(guard, undefined, inputs)
              : store.get(guard);
          if (typeof allowed !== 'boolean')
            throw new TypeError('bond: guard must return a synchronous boolean.');
          if (!allowed) return;
          const next = map
            ? (Reflect.apply(map, undefined, inputs) as unknown)
            : state
              ? [data]
              : args;
          if (!Array.isArray(next))
            throw new TypeError('bond: map must return an argument tuple synchronously.');
          if (config.yield && publish) {
            const target =
              typeof config.yield === 'function' ? config.yield(store.get) : config.yield;
            const result: unknown = Reflect.apply(store.set, store, [target, ...next]);
            if (isPromise(result)) {
              const sink = current.owners;
              void Promise.resolve(result).catch((error) => report(sink, error));
            }
          }
          store.set($last, next);
          if (publish) emitAction(store.get, channel, next);
        } catch (error) {
          report(current.owners, error);
        }
      };
      try {
        if (isActionSource(clock)) {
          const listeners = store.get(clock[actionSource]);
          const listener = (args: readonly unknown[]) =>
            enqueueAction(
              store.get,
              () => {
                if (current.owners.size) evaluate(args);
              },
              (error) => report(current.owners, error),
            );
          listeners.add(listener);
          current.stop = () => {
            listeners.delete(listener);
          };
          const disconnect =
            'connect' in clock && typeof clock.connect === 'function'
              ? (clock.connect(store, {
                  onError: (error: unknown) => report(current.owners, error),
                }) as () => void)
              : () => {};
          current.stop = () => {
            listeners.delete(listener);
            disconnect();
          };
        } else {
          let previous = store.get(clock);
          current.stop = store.sub(clock, () => {
            try {
              const next = store.get(clock);
              if (Object.is(previous, next)) return;
              previous = next;
              enqueueAction(
                store.get,
                () => {
                  if (current.owners.size) evaluate(trigger ? [next] : []);
                },
                (error) => report(current.owners, error),
              );
            } catch (error) {
              report(current.owners, error);
            }
          });
          if (!trigger && !config.yield) evaluate([], false);
        }
      } catch (error) {
        current.owners.delete(owner);
        current.stop();
        connections.delete(store);
        throw error;
      }
    }
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      current.owners.delete(owner);
      if (!current.owners.size) {
        current.stop();
        current.stop = () => {};
        connections.delete(store);
      }
    };
  };
  return output;
}

type Owner = BondOptions;
type Runtime = { owners: Set<Owner>; stop: () => void };
function report(owners: Set<Owner>, error: unknown) {
  const handlers = [...owners].flatMap((owner) => (owner.onError ? [owner.onError] : []));
  if (!handlers.length) {
    console.error(error);
    return;
  }
  for (const handler of handlers) {
    try {
      handler(error);
    } catch (failure) {
      console.error(failure);
    }
  }
}
function isPromise(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

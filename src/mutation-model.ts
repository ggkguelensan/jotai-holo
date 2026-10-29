import {
  MutationObserver,
  type DefaultError,
  type MutationObserverOptions,
  type MutationObserverResult,
  type QueryClient,
} from '@tanstack/query-core';
import { atom, type Atom } from 'jotai/vanilla';
import { actionAtom, type ActionAtom } from './action-atom.js';
import { isAtom } from './is-atom.js';
import { prism } from './prism.js';
import { queryClientAtom } from './query-client-atom.js';

type Snapshot<Result> = Result extends unknown ? Readonly<Omit<Result, 'mutate' | 'reset'>> : never;

export type MutationSnapshot<Data, Error, Variables, Context> = Snapshot<
  MutationObserverResult<Data, Error, Variables, Context>
>;

type VariablesArgs<Variables> = undefined extends Variables
  ? [variables?: Variables]
  : [variables: Variables];

/** A store-local mutation executor. Reads never execute a mutation. */
export function createMutationModel<
  Data = unknown,
  Error = DefaultError,
  Variables = void,
  Context = unknown,
  const Shape extends Record<
    string,
    (result: MutationSnapshot<Data, Error, Variables, Context>) => unknown
  > = {},
>(config: {
  mutation: () => MutationObserverOptions<Data, Error, Variables, Context>;
  prism?: Shape &
    Record<string, (result: MutationSnapshot<Data, Error, Variables, Context>) => unknown> & {
      mutate?: never;
      reset?: never;
    };
  client?: QueryClient | Atom<QueryClient | null>;
}): {
  mutate: ActionAtom<VariablesArgs<Variables>, Promise<Data>>;
  reset: ActionAtom<[], void>;
} & { [Name in keyof Shape]: Atom<ReturnType<Shape[Name]>> } {
  type NativeResult = MutationObserverResult<Data, Error, Variables, Context>;
  type Result = MutationSnapshot<Data, Error, Variables, Context>;
  type Publish = (result: Result) => void;
  if (config.prism && ('mutate' in config.prism || 'reset' in config.prism))
    throw new TypeError('createMutationModel: prism names mutate and reset are reserved.');

  function createRuntime(client: QueryClient) {
    // Apply client/key defaults before validating unsupported React-only options.
    const options = client.defaultMutationOptions(config.mutation());
    if (options.throwOnError !== undefined && options.throwOnError !== false)
      throw new TypeError(
        'createMutationModel: throwOnError is unsupported. Handle the returned Promise or read an error projection.',
      );
    const observer = new MutationObserver<Data, Error, Variables, Context>(client, options);
    let nativeResult: NativeResult | undefined;
    let state: Result;
    function snapshot() {
      const result = observer.getCurrentResult();
      if (result !== nativeResult) {
        const { mutate: _mutate, reset: _reset, ...fields } = result;
        state = fields as Result;
        nativeResult = result;
      }
      return state;
    }
    const $snapshot = atom<Result>(snapshot());
    const owners = new Set<Publish>();
    let unsubscribe: (() => void) | undefined;

    function retain(publish: Publish) {
      owners.add(publish);
      // One native listener is shared by mounted projections and active calls.
      unsubscribe ??= observer.subscribe(() => {
        owners.values().next().value?.(snapshot());
      });
      publish(snapshot());
      return () => {
        owners.delete(publish);
        if (!owners.size) {
          unsubscribe?.();
          unsubscribe = undefined;
        }
      };
    }

    $snapshot.onMount = (publish) => retain(publish);
    return { observer, $snapshot, retain, snapshot };
  }

  // Jotai evaluates this cache independently in each store. Clients are weak keys.
  const $cache = atom(() => new WeakMap<QueryClient, ReturnType<typeof createRuntime>>());
  const $runtime = atom((get) => {
    const provided = config.client ?? queryClientAtom;
    const client = isAtom(provided) ? get(provided as Atom<QueryClient | null>) : provided;
    if (!client)
      throw new Error(
        'createMutationModel: provide the application QueryClient through queryClientAtom or client.',
      );
    const cache = get($cache);
    let runtime = cache.get(client);
    if (!runtime) {
      runtime = createRuntime(client);
      cache.set(client, runtime);
    }
    return runtime;
  });
  const $result = atom((get): MutationSnapshot<Data, Error, Variables, Context> => {
    const { $snapshot } = get($runtime);
    return get($snapshot);
  });
  const mutate = actionAtom((get, set, ...args: VariablesArgs<Variables>): Promise<Data> => {
    if (args.length > 1)
      throw new TypeError(
        'createMutationModel: per-call options are unsupported. Use the returned Promise.',
      );
    const { observer, $snapshot, retain } = get($runtime);
    const release = retain((result) => set($snapshot, result));
    try {
      return observer.mutate(args[0] as Variables).finally(release);
    } catch (error) {
      release();
      throw error;
    }
  });
  const reset = actionAtom((get, set) => {
    const { observer, $snapshot, snapshot } = get($runtime);
    observer.reset();
    set($snapshot, snapshot());
  });
  return { ...prism($result, config.prism ?? ({} as Shape)), mutate, reset } as {
    mutate: ActionAtom<VariablesArgs<Variables>, Promise<Data>>;
    reset: ActionAtom<[], void>;
  } & { [Name in keyof Shape]: Atom<ReturnType<Shape[Name]>> };
}

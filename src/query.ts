import {
  QueryObserver,
  notifyManager,
  type DefaultError,
  type QueryClient,
  type QueryKey,
  type QueryObserverOptions,
  type QueryObserverResult,
} from '@tanstack/query-core';
import { atom, type Atom } from 'jotai/vanilla';
import { readSource, type AtomSource, type SourceValue } from './atom-source.js';
import { isAtom } from './operator-source.js';
import { prism } from './prism.js';
import { queryClientAtom } from './query-client-atom.js';

export { queryClientAtom } from './query-client-atom.js';

export function queryModel<
  QueryData,
  Error = DefaultError,
  Data = QueryData,
  Key extends QueryKey = QueryKey,
  const Source extends AtomSource | undefined = undefined,
  const Shape extends Record<
    string,
    (result: QueryObserverResult<Data, Error>) => unknown
  > = Record<string, (result: QueryObserverResult<Data, Error>) => unknown>,
>(config: {
  state?: Source;
  query: (
    state: Source extends AtomSource ? SourceValue<Source> : undefined,
  ) => QueryObserverOptions<QueryData, Error, Data, QueryData, Key>;
  prism: Shape;
  client?: QueryClient | Atom<QueryClient | null>;
}): { [Name in keyof Shape]: Atom<ReturnType<Shape[Name]>> } {
  type Observer = QueryObserver<QueryData, Error, Data, QueryData, Key>;
  type Runtime = {
    observer: Observer;
    $snapshot: ReturnType<typeof atom<QueryObserverResult<Data, Error>>>;
  };
  const $cache = atom(() => new WeakMap<QueryClient, Runtime>());
  const $options = atom((get) => {
    const source = config.state;
    const state = source === undefined ? undefined : readSource(get, source);
    return config.query(state as Source extends AtomSource ? SourceValue<Source> : undefined);
  });
  const $runtime = atom((get) => {
    const provided = config.client ?? queryClientAtom;
    const client = isAtom(provided) ? get(provided as Atom<QueryClient | null>) : provided;
    if (!client)
      throw new Error(
        'queryModel: provide the application QueryClient through queryClientAtom or client.',
      );
    const options = client.defaultQueryOptions(get($options));
    options._optimisticResults = 'optimistic';
    const cache = get($cache);
    let runtime = cache.get(client);
    if (!runtime) {
      const observer = new QueryObserver(client, options);
      const $snapshot = atom(observer.getOptimisticResult(options));
      $snapshot.onMount = (set) => {
        let active = true;
        const publish = notifyManager.batchCalls((result: QueryObserverResult<Data, Error>) => {
          if (active) set(result);
        });
        // The Query may have expired while this atom was detached. Rebind before
        // subscribing, even if Jotai's cached options have not changed.
        observer.setOptions(observer.options);
        const unsubscribe = observer.subscribe(publish);
        observer.updateResult();
        set(observer.getCurrentResult());
        return () => {
          active = false;
          unsubscribe();
        };
      };
      runtime = { observer, $snapshot };
      cache.set(client, runtime);
    } else runtime.observer.setOptions(options);
    return { ...runtime, options };
  });
  const $result = atom((get) => {
    const { observer, $snapshot, options } = get($runtime);
    get($snapshot);
    const result = observer.getOptimisticResult(options);
    if (
      result.isError &&
      !result.isFetching &&
      (typeof options.throwOnError === 'function'
        ? options.throwOnError(result.error, observer.getCurrentQuery())
        : options.throwOnError)
    )
      throw result.error;
    return result;
  });
  return prism($result, config.prism);
}

export { mutationAtoms, type MutationSnapshot } from './mutation-atoms.js';

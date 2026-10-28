import { bounded, isPromiseLike } from './async-task.js';
import { atom, type Atom } from 'jotai/vanilla';
import type { ActionSource } from './action-source.js';
import { bond } from './bond.js';
import { actionSource } from './action-source.js';
import { subscribeAction } from './event-dispatch.js';
import type { AtomSource, SourceValue } from './atom-source.js';
import { managedConnection, acquireModelRecord, type ManagedConnection } from './model-managed.js';
import { addModelActivation, type ModelSource } from './model-composition.js';
import type { Store } from './model-protocol.js';
import type { ModelDefinition } from './model.js';

export type AnalyticsContext = {
  readonly signal: AbortSignal;
  readonly report: (error: unknown) => void;
};
export interface AnalyticsAdapter<Message = unknown> {
  /** Completion means handoff, not necessarily server ingestion. */
  send(message: Message, context: AnalyticsContext): void | Promise<void>;
  flush?(): void | Promise<void>;
  dispose?(): void | Promise<void>;
}
type Engines = Record<
  string,
  (context: AnalyticsContext) => AnalyticsAdapter<any> | Promise<AnalyticsAdapter<any>>
>;
type Message<Factory> = Factory extends (...args: any[]) => infer Result
  ? Awaited<Result> extends AnalyticsAdapter<infer M>
    ? M
    : never
  : never;
type TriggerArgs<T> =
  T extends ActionSource<infer Args> ? Args : T extends Atom<infer Value> ? [Value] : never;
type EventInputs<S, T> = S extends AtomSource
  ? [SourceValue<S>, ...TriggerArgs<T>]
  : TriggerArgs<T>;
export type AnalyticsError = {
  readonly engine: string;
  readonly phase: 'map' | 'load' | 'send' | 'overflow' | 'expired' | 'flush' | 'dispose';
  readonly error: unknown;
};
type Pending = { value: unknown; time: number };
type EngineRuntime = {
  adapter?: AnalyticsAdapter<any>;
  queue: Pending[];
  worker?: Promise<void>;
  controller: AbortController;
  closed: boolean;
};

/** Optional, vendor-neutral analytics. Engines are lazy and isolated per Jotai store. */
export function createAnalytics<const E extends Engines>(options: {
  engines: E;
  onError?: (error: AnalyticsError) => void;
  queueLimit?: number;
  timeout?: number;
}) {
  const limit = options.queueLimit ?? 100;
  const timeout = options.timeout ?? 30_000;
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isFinite(timeout) || timeout <= 0)
    throw new TypeError('createAnalytics: queueLimit and timeout must be positive.');
  const report = (engine: string, phase: AnalyticsError['phase'], error: unknown) => {
    try {
      if (options.onError) options.onError({ engine, phase, error });
      else console.error(error);
    } catch (failure) {
      console.error(failure);
    }
  };
  const $engines = atom(() => new Map<string, EngineRuntime>());
  const $closed = atom(false);

  function publish(store: Store, name: string, value: unknown) {
    if (store.get($closed)) return;
    const states = store.get($engines);
    let runtime = states.get(name);
    if (!runtime) {
      runtime = { queue: [], controller: new AbortController(), closed: false };
      states.set(name, runtime);
    }
    if (runtime.closed) return;
    if (runtime.queue.length >= limit) {
      report(name, 'overflow', new Error('Analytics queue is full; newest message discarded.'));
      return;
    }
    runtime.queue.push({ value, time: Date.now() });
    start(name, runtime);
  }
  function start(name: string, runtime: EngineRuntime) {
    if (runtime.worker || runtime.closed || !runtime.queue.length) return;
    const run = async () => {
      let phase: AnalyticsError['phase'] = 'load';
      try {
        if (!runtime.adapter) {
          const factory = options.engines[name];
          if (!factory) throw new TypeError(`Unknown analytics engine: ${name}`);
          runtime.adapter = await bounded(
            (signal) =>
              factory({
                signal,
                report: (error) => {
                  if (!runtime.closed) report(name, 'send', error);
                },
              }),
            timeout,
            runtime.controller.signal,
            (adapter) => {
              void Promise.resolve()
                .then(() => adapter.dispose?.())
                .catch((error) => report(name, 'dispose', error));
            },
          );
        }
        phase = 'send';
        while (!runtime.closed && runtime.queue.length) {
          const message = runtime.queue[0]!;
          if (Date.now() - message.time >= timeout) {
            runtime.queue.shift();
            report(name, 'expired', new Error('Analytics message expired.'));
            continue;
          }
          try {
            await bounded(
              (signal) =>
                runtime.adapter!.send(message.value, {
                  signal,
                  report: (error) => {
                    if (!runtime.closed) report(name, 'send', error);
                  },
                }),
              Math.max(1, timeout - (Date.now() - message.time)),
              runtime.controller.signal,
            );
          } catch (error) {
            report(name, 'send', error);
          }
          runtime.queue.shift();
        }
      } catch (error) {
        runtime.queue.length = 0;
        report(name, phase, error);
      }
    };
    runtime.worker = Promise.resolve()
      .then(run)
      .finally(() => {
        delete runtime.worker;
        if (!runtime.closed && runtime.queue.length) start(name, runtime);
      });
  }

  function event<
    const T extends Atom<unknown>,
    const S extends AtomSource | undefined = undefined,
  >(config: {
    trigger: T;
    state?: S;
    map: { [K in keyof E]?: (...args: EventInputs<S, T>) => Message<E[K]> };
  }): ManagedConnection {
    for (const key of Object.keys(config.map))
      if (!Object.hasOwn(options.engines, key))
        throw new TypeError(`Unknown analytics engine: ${key}`);
    return {
      [managedConnection](store) {
        const link = bond<readonly [unknown[]], AtomSource | undefined, Atom<unknown>>({
          ...(config.state === undefined ? {} : { state: config.state }),
          trigger: config.trigger,
          map: (...args: unknown[]) => [args] as const,
        });
        const unsubscribe = subscribeAction(store.get, link[actionSource], ([args]) => {
          for (const [name, mapper] of Object.entries(config.map)) {
            try {
              const message = Reflect.apply(
                mapper as (...args: never[]) => unknown,
                undefined,
                args,
              );
              // A detached payload cannot retain a model, props object or later mutations.
              publish(store, name, detach(message));
            } catch (error) {
              report(name, 'map', error);
            }
          }
        });
        try {
          const disconnect = link.connect(store, { onError: (error) => report('*', 'map', error) });
          return () => {
            unsubscribe();
            disconnect();
          };
        } catch (error) {
          unsubscribe();
          throw error;
        }
      },
    };
  }

  return {
    event,
    async flush(store: Store): Promise<void> {
      await Promise.all(
        [...store.get($engines)].map(async ([name, runtime]) => {
          try {
            await bounded(
              async () => {
                while (runtime.worker) await runtime.worker;
                await runtime.adapter?.flush?.();
              },
              timeout,
              runtime.controller.signal,
            );
          } catch (error) {
            report(name, 'flush', error);
          }
        }),
      );
    },
    async dispose(store: Store): Promise<void> {
      store.set($closed, true);
      const states = store.get($engines);
      await Promise.all(
        [...states].map(async ([name, runtime]) => {
          runtime.closed = true;
          runtime.queue.length = 0;
          runtime.controller.abort();
          try {
            await bounded(
              () => runtime.adapter?.dispose?.(),
              timeout,
              new AbortController().signal,
            );
          } catch (error) {
            report(name, 'dispose', error);
          }
        }),
      );
      states.clear();
    },
  };
}

/** Load an analytics factory on first ownership, activate its managed declarations. */
export function modelAnalytics<Model extends object>(
  load: () =>
    | ((model: Model) => object & { then?: never })
    | Promise<(model: Model) => object & { then?: never }>,
  options: { onError?: (error: unknown) => void } = {},
) {
  return <Initial>(source: ModelSource<Model, Initial>): ModelDefinition<Model, Initial> => {
    const children = new WeakMap<Store, WeakMap<object, object>>();
    return addModelActivation(source, (model, _initial, store, scope) => {
      let models = children.get(store);
      if (!models) children.set(store, (models = new WeakMap()));
      const report = (error: unknown) => {
        try {
          if (options.onError) options.onError(error);
          else console.error(error);
        } catch (failure) {
          console.error(failure);
        }
      };
      const cached = models.get(scope);
      if (cached) {
        try {
          return acquireModelRecord(store, cached);
        } catch (error) {
          report(error);
          return;
        }
      }
      let owner: { model: Model; store: Store; scope: object } | undefined = {
        model,
        store,
        scope,
      };
      let release: (() => void) | undefined;
      const activate = (factory: (model: Model) => object) => {
        const current = owner;
        if (!current) return;
        const liveModels = children.get(current.store)!;
        const child = liveModels.get(current.scope) ?? factory(current.model);
        if (!child || typeof child !== 'object' || typeof Reflect.get(child, 'then') === 'function')
          throw new TypeError('modelAnalytics: factory must return a synchronous model record.');
        release = acquireModelRecord(current.store, child);
        liveModels.set(current.scope, child);
      };
      try {
        const factory = load();
        if (isPromiseLike(factory)) void Promise.resolve(factory).then(activate).catch(report);
        else activate(factory);
      } catch (error) {
        report(error);
      }
      return () => {
        owner = undefined;
        try {
          release?.();
        } finally {
          release = undefined;
        }
      };
    });
  };
}

/** JSON-compatible, detached and immutable provider message. */
function detach(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    !value ||
    typeof value !== 'object' ||
    (!Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  )
    throw new TypeError('Analytics messages must contain JSON-compatible values.');
  if (ancestors.has(value)) throw new TypeError('Analytics message contains a cycle.');
  ancestors.add(value);
  try {
    return Object.freeze(
      Array.isArray(value)
        ? value.map((item) => detach(item, ancestors))
        : Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, detach(item, ancestors)]),
          ),
    );
  } finally {
    ancestors.delete(value);
  }
}

import type { ModelModifierTag } from './model-modifier.js';
import { atom } from 'jotai/vanilla';
import {
  modelAcquire,
  modelDefinition,
  modelIdentity,
  modelPeek,
  type ModelAtom,
} from './model-protocol.js';
import { bounded, isPromiseLike } from './async-task.js';
import { modelBlueprints } from './model-config.js';
import { createModel, type ModelDefinition } from './model-registry.js';
import type { Store } from './model-protocol.js';
import { acquireResources, type Resource } from './resource.js';

export type ModelFactory<Model extends object, Initial = undefined> = (
  initial: Initial,
) => Model & { then?: never };
export type ModelSource<Model extends object, Initial = undefined> =
  | ModelFactory<Model, Initial>
  | ModelDefinition<Model, Initial>;
type Activation = (model: any, initial: any, store: Store, scope: object) => void | (() => void);
type Descriptor = {
  create: ModelFactory<any, any>;
  initial?: unknown;
  retainTime?: number;
  activate: readonly Activation[];
  flush?: (model: any, store: Store, scope: object) => Promise<void>;
  resources?: (model: any) => readonly Resource[];
  base?: ModelDefinition<any, any>;
};
const descriptors = new WeakMap<object, Descriptor>();
const activations = new WeakMap<Store, WeakMap<object, WeakMap<Activation, Resource>>>();

function describe(source: ModelSource<any, any>): Descriptor {
  const known = descriptors.get(source);
  if (known) return known;
  const blueprint = modelBlueprints.get(source);
  return {
    ...(blueprint ?? { create: source }),
    activate: [],
    ...(modelDefinition in source ? { base: source as ModelDefinition<any, any> } : {}),
  } as Descriptor;
}

/** Internal composition seam: wrappers share records and activation ownership. */
export function modifyModel<Model extends object, Initial>(
  source: ModelSource<Model, Initial>,
  change: (descriptor: Descriptor) => Descriptor,
): ModelDefinition<Model, Initial> {
  const descriptor = change(describe(source));
  const base =
    descriptor.base ??
    createModel({
      create: descriptor.create,
      initial: descriptor.initial,
      ...(descriptor.retainTime === undefined ? {} : { retainTime: descriptor.retainTime }),
      ...(descriptor.resources ? { resources: descriptor.resources } : {}),
    });
  descriptor.base = base;
  const tokens = new WeakMap<object, object>();
  let defaultSelection: ModelAtom<Model> | undefined;
  const definition: ModelDefinition<Model, Initial> = Object.assign(
    (options: import('./model.js').ModelOptions<Initial> = {}): ModelAtom<Model> => {
      const isDefault = !Object.hasOwn(options, 'key') && !Object.hasOwn(options, 'initial');
      if (isDefault && defaultSelection) return defaultSelection;
      const selected = base(options);
      const identity = selected[modelIdentity];
      const wrapped = Object.assign(
        atom((get) => get(selected) as Model),
        {
          [modelIdentity]: {
            definition,
            key: identity.key,
            initial: identity.initial,
            entry(get: import('jotai/vanilla').Getter) {
              const original = identity.entry(get);
              let token = tokens.get(original);
              if (!token) {
                token = {};
                tokens.set(original, token);
              }
              return token;
            },
          },
          [modelAcquire](store: Store) {
            const releaseBase = selected[modelAcquire](store);
            let releaseHooks: () => void;
            try {
              const model = store.get(selected);
              const entry = identity.entry(store.get);
              let entries = activations.get(store);
              if (!entries) activations.set(store, (entries = new WeakMap()));
              let hooks = entries.get(entry);
              if (!hooks) entries.set(entry, (hooks = new WeakMap()));
              releaseHooks = acquireResources(
                store,
                descriptor.activate.map((activate) => {
                  let resource = hooks.get(activate);
                  if (!resource) {
                    resource = {
                      connect: (current) =>
                        activate(model, identity.initial(current.get), current, entry),
                    };
                    hooks.set(activate, resource);
                  }
                  return resource;
                }),
              );
            } catch (error) {
              try {
                releaseBase();
              } catch (rollback) {
                throw new AggregateError(
                  [error, rollback],
                  'Model activation and rollback failed.',
                );
              }
              throw error;
            }
            let active = true;
            return () => {
              if (!active) return;
              active = false;
              const errors: unknown[] = [];
              try {
                releaseHooks();
              } catch (error) {
                errors.push(error);
              }
              try {
                releaseBase();
              } catch (error) {
                errors.push(error);
              }
              if (errors.length) throw new AggregateError(errors, 'Model cleanup failed.');
            };
          },
        },
      );
      if (isDefault) defaultSelection = wrapped;
      return wrapped;
    },
    {
      [modelDefinition]: true as const,
      acquire(store: Store, options?: import('./model.js').ModelOptions<Initial>) {
        const selected = definition(options);
        const release = selected[modelAcquire](store);
        const model = store.get(selected);
        const scope = base(options)[modelIdentity].entry(store.get);
        return {
          model,
          release,
          flush: async () => {
            await base.flush(store, options);
            await descriptor.flush?.(model, store, scope);
          },
        };
      },
      async flush(store: Store, options?: Pick<import('./model.js').ModelOptions<Initial>, 'key'>) {
        const model = base[modelPeek](store, options);
        const scope = model ? base(options)[modelIdentity].entry(store.get) : undefined;
        await base.flush(store, options);
        if (model && scope) await descriptor.flush?.(model, store, scope);
      },
      [modelPeek]: base[modelPeek],
      remove: base.remove,
    },
  );
  descriptors.set(definition, descriptor);
  return definition;
}

export function modelRegistry(options?: {
  retainTime?: number;
  initial?: undefined;
}): (<Model extends object, Initial>(
  source: ModelSource<Model, Initial>,
) => ModelDefinition<Model, Initial>) &
  ModelModifierTag;
export function modelRegistry<Initial>(options: {
  retainTime?: number;
  initial: Initial;
}): (<Model extends object>(
  source: ModelSource<Model, Initial>,
) => ModelDefinition<Model, Initial>) &
  ModelModifierTag;
export function modelRegistry(options: { retainTime?: number; initial?: unknown } = {}) {
  for (const field of ['gcTime', 'connect', 'resources'])
    if (field in options) throw new TypeError(`modelRegistry: unsupported field "${field}".`);
  return (source: ModelSource<object, unknown>) =>
    modifyModel(source, (descriptor) => {
      const { base: _previousRegistry, ...settings } = descriptor;
      return {
        ...settings,
        ...(Object.hasOwn(options, 'initial') ? { initial: options.initial } : {}),
        retainTime: options.retainTime ?? Infinity,
      };
    });
}

export function addModelActivation<Model extends object, Initial>(
  source: ModelSource<Model, Initial>,
  activation: (model: Model, initial: Initial, store: Store, scope: object) => void | (() => void),
): ModelDefinition<Model, Initial> {
  return modifyModel(source, (descriptor) => ({
    ...descriptor,
    activate: [...descriptor.activate, activation],
  }));
}

/** A connection belongs to a selected model entry and its active owners. */
export type ModelConnectionContext<Initial> = {
  readonly initial: Initial;
  readonly store: Store;
};

/** Extend a model with synchronous setup and cleanup, without changing its record. */
export function modelConnection<Model extends object, Initial = undefined>(
  connect: (model: Model, context: ModelConnectionContext<Initial>) => void | (() => void),
) {
  const modifier = (source: ModelSource<Model, Initial>): ModelDefinition<Model, Initial> =>
    addModelActivation(source, (model, initial, store) => connect(model, { initial, store }));
  return modifier as typeof modifier & ModelModifierTag;
}

export type ModelLifecycleContext<Initial> = {
  readonly initial: Initial;
  readonly signal: AbortSignal;
};
type Writable<Value> = import('jotai/vanilla').WritableAtom<unknown, [Value], unknown>;
type Readable<Value> = import('jotai/vanilla').Atom<Value>;

/** Load once per retained instance. Snapshot edits win over late restoration. */
export function modelLifecycle<Model extends object, Initial, Loaded, Snapshot = never>(options: {
  load?: (context: ModelLifecycleContext<Initial>) => Loaded | Promise<Loaded>;
  restore?: (model: Model) => Writable<Loaded>;
  snapshot?: (model: Model) => Readable<Snapshot>;
  save?: (
    context: ModelLifecycleContext<Initial> & { readonly snapshot: Snapshot },
  ) => void | Promise<void>;
  timeout?: number;
  onError?: (error: unknown) => void;
}) {
  const modifier = (source: ModelSource<Model, Initial>): ModelDefinition<Model, Initial> => {
    if (options.load && !options.restore)
      throw new TypeError('modelLifecycle: load requires restore.');
    if (options.save && !options.snapshot)
      throw new TypeError('modelLifecycle: save requires snapshot.');
    const timeout = options.timeout ?? 10_000;
    if (!Number.isFinite(timeout) || timeout <= 0)
      throw new TypeError('modelLifecycle: timeout must be positive.');
    type Runtime = {
      initialized: boolean;
      revision: number;
      saved: number;
      latest?: Snapshot;
      worker?: Promise<void> | undefined;
      initial: Initial;
    };
    const states = new WeakMap<Store, WeakMap<object, Runtime>>();
    const report = (error: unknown) => {
      try {
        if (options.onError) options.onError(error);
        else console.error(error);
      } catch (error) {
        console.error(error);
      }
    };
    const find = (store: Store, scope: object) => states.get(store)?.get(scope);
    const save = (runtime: Runtime): Promise<void> => {
      if (runtime.worker) return runtime.worker.then(() => save(runtime));
      if (!options.save || runtime.saved === runtime.revision) return Promise.resolve();
      const revision = runtime.revision;
      const snapshot = runtime.latest as Snapshot;
      const worker = bounded(
        (signal) =>
          options.save!({
            initial: runtime.initial,
            snapshot,
            signal,
          }),
        timeout,
        new AbortController().signal,
      )
        .then(() => {
          runtime.saved = revision;
        })
        .finally(() => {
          runtime.worker = undefined;
        });
      runtime.worker = worker;
      return worker.then(() => (runtime.saved < runtime.revision ? save(runtime) : undefined));
    };
    return modifyModel(source, (descriptor) => ({
      ...descriptor,
      flush: async (model: Model, store: Store, scope: object) => {
        await descriptor.flush?.(model, store, scope);
        const runtime = find(store, scope);
        if (runtime) await save(runtime);
      },
      activate: [
        ...descriptor.activate,
        (model: Model, initial: Initial, store: Store, scope: object) => {
          let models = states.get(store);
          if (!models) states.set(store, (models = new WeakMap()));
          let runtime = models.get(scope);
          if (!runtime) {
            runtime = { initialized: false, revision: 0, saved: 0, initial };
            models.set(scope, runtime);
          }
          const current = runtime;
          const controller = new AbortController();
          let applying = false;
          const snapshot = options.snapshot?.(model);
          const readSnapshot = () => {
            const value = store.get(snapshot!);
            if (isPromiseLike(value)) {
              void Promise.resolve(value).catch(report);
              throw new TypeError('modelLifecycle: snapshot must be synchronous.');
            }
            return value;
          };
          const before = snapshot ? readSnapshot() : undefined;
          const beforeRevision = current.revision;
          const stop = snapshot
            ? store.sub(snapshot, () => {
                if (applying) return;
                try {
                  const value = readSnapshot();
                  current.revision++;
                  current.latest = value;
                } catch (error) {
                  report(error);
                }
              })
            : () => {};
          if (options.load && !current.initialized) {
            // Clear the owner on release: an uncooperative loader must not retain a store/model.
            let owner: { store: Store; model: Model } | undefined = { store, model };
            void bounded((signal) => options.load!({ initial, signal }), timeout, controller.signal)
              .then((value) => {
                const active = owner;
                if (!active || controller.signal.aborted) return;
                if (
                  current.revision === beforeRevision &&
                  current.revision === 0 &&
                  (!snapshot || Object.is(before, active.store.get(snapshot)))
                ) {
                  applying = true;
                  try {
                    const result = active.store.set(options.restore!(active.model), value);
                    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
                      void Promise.resolve(result).catch(report);
                      throw new TypeError('modelLifecycle: restore must be synchronous.');
                    }
                  } finally {
                    applying = false;
                  }
                }
                current.initialized = true;
              })
              .catch((error) => {
                if (!controller.signal.aborted) report(error);
              });
            const clear = () => {
              owner = undefined;
            };
            controller.signal.addEventListener('abort', clear, { once: true });
          }
          return () => {
            stop();
            controller.abort();
            void save(current).catch(report);
          };
        },
      ],
    }));
  };
  return modifier as typeof modifier & ModelModifierTag;
}

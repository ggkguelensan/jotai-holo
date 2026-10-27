import { atom, type Getter } from 'jotai/vanilla';
import { acquireResources, type Resource } from './resource.js';
import {
  modelAcquire,
  modelDefinition,
  modelIdentity,
  type ModelAtom,
  type Store,
} from './model-protocol.js';

export type ModelKeyPart =
  | string
  | number
  | boolean
  | null
  | readonly ModelKeyPart[]
  | { readonly [key: string]: ModelKeyPart };
export type ModelKey = readonly ModelKeyPart[];
export type ModelOptions<Initial> = { readonly key?: ModelKey; readonly initial?: Initial };
export type ModelLease<Model extends object> = { readonly model: Model; release(): void };
export type ModelDefinition<Model extends object, Initial = undefined> = {
  (options?: ModelOptions<Initial>): ModelAtom<Model>;
  readonly [modelDefinition]: true;
  acquire(store: Store, options?: ModelOptions<Initial>): ModelLease<Model>;
  remove(store: Store, options?: Pick<ModelOptions<Initial>, 'key'>): boolean;
};

type Entry = {
  weak: WeakRef<object>;
  retained?: object;
  owners: Set<object>;
  revision: ReturnType<typeof atom<number>>;
  cleanup?: () => void;
  timer?: ReturnType<typeof setTimeout>;
};
type Registry = {
  models: WeakMap<object, Map<string, Entry>>;
  collected: FinalizationRegistry<{ definition: WeakRef<object>; key: string; entry: Entry }>;
};
const $registry = atom<Registry>(() => {
  const models = new WeakMap<object, Map<string, Entry>>();
  return {
    models,
    collected: new FinalizationRegistry(({ definition, key, entry }) => {
      const owner = definition.deref();
      const entries = owner && models.get(owner);
      if (entries?.get(key) === entry && !entry.retained && !entry.owners.size) entries.delete(key);
    }),
  };
});

/** Store-owned keyed models. Pure reads are weakly cached; acquired models default to permanent retention. */
export function createModel<Model extends object, Initial = undefined>(
  config: {
    create: (initial: Initial) => Model & { then?: never };
    retainTime?: number;
    /** @deprecated Use retainTime. */
    gcTime?: number;
    resources?: (model: Model) => readonly Resource[];
    connect?: (model: Model, store: Store) => void | (() => void);
  } & ([Initial] extends [undefined] ? { initial?: Initial } : { initial: Initial }),
): ModelDefinition<Model, Initial> {
  if (config.retainTime !== undefined && config.gcTime !== undefined)
    throw new TypeError('createModel: use retainTime, not both retainTime and gcTime.');
  const gcTime = config.retainTime ?? config.gcTime ?? Infinity;
  if (!(gcTime >= 0) || (gcTime !== Infinity && !Number.isFinite(gcTime))) {
    throw new TypeError('createModel: retainTime must be a non-negative number or Infinity.');
  }
  let defaultSelection: ModelAtom<Model> | undefined;
  const definition = Object.assign(
    (options: ModelOptions<Initial> = {}) => {
      if (!Object.hasOwn(options, 'key') && !Object.hasOwn(options, 'initial') && defaultSelection)
        return defaultSelection;
      const key = options.key === undefined ? 'default' : `key:${encodeKey(options.key)}`;
      const initial = Object.hasOwn(options, 'initial')
        ? (options.initial as Initial)
        : (config.initial as Initial);
      const resolve = (get: Getter) => {
        const registry = get($registry);
        let entries = registry.models.get(definition);
        if (!entries) {
          entries = new Map();
          registry.models.set(definition, entries);
        }
        let entry = entries.get(key);
        let model = entry?.retained ?? entry?.weak.deref();
        if (!entry || !model) {
          model = config.create(initial);
          if (
            ((typeof model !== 'object' || model === null) && typeof model !== 'function') ||
            typeof Reflect.get(model, 'then') === 'function'
          ) {
            throw new TypeError('createModel: create must return a synchronous model object.');
          }
          entry = { weak: new WeakRef(model), owners: new Set(), revision: atom(0) };
          entries.set(key, entry);
          registry.collected.register(
            model,
            { definition: new WeakRef(definition), key, entry },
            entry,
          );
        }
        return { registry, entry, model: model as Model };
      };
      const selected = atom((get) => {
        const { entry, model } = resolve(get);
        get(entry.revision);
        return model;
      });
      const acquire = (store: Store) => {
        // Reading ensures this handle depends on the entry's eviction revision.
        store.get(selected);
        const { registry, entry, model } = resolve(store.get);
        if (entry.timer !== undefined) {
          clearTimeout(entry.timer);
          delete entry.timer;
        }
        const owner = {};
        const previouslyRetained = entry.retained;
        entry.owners.add(owner);
        entry.retained = model;
        if (entry.owners.size === 1) {
          try {
            const resources: Resource[] = [...(config.resources?.(model) ?? [])];
            if (config.connect) resources.unshift({ connect: () => config.connect!(model, store) });
            const cleanup = acquireResources(store, resources);
            if (cleanup !== undefined && typeof cleanup !== 'function')
              throw new TypeError(
                'createModel: connect must return a synchronous cleanup function or undefined.',
              );
            if (cleanup) entry.cleanup = cleanup;
          } catch (error) {
            entry.owners.delete(owner);
            if (!entry.owners.size) {
              if (previouslyRetained) {
                entry.retained = previouslyRetained;
                if (gcTime !== Infinity)
                  scheduleEviction(registry, definition, key, entry, store, gcTime);
              } else delete entry.retained;
            }
            throw error;
          }
        }
        let active = true;
        return () => {
          if (!active) return;
          active = false;
          entry.owners.delete(owner);
          if (entry.owners.size) return;
          const cleanup = entry.cleanup;
          delete entry.cleanup;
          try {
            cleanup?.();
          } finally {
            if (!entry.owners.size && gcTime !== Infinity) {
              scheduleEviction(registry, definition, key, entry, store, gcTime);
            }
          }
        };
      };
      const result = Object.assign(selected, {
        [modelIdentity]: { definition, key },
        [modelAcquire]: acquire,
      });
      if (key === 'default' && !Object.hasOwn(options, 'initial')) defaultSelection = result;
      return result;
    },
    {
      [modelDefinition]: true as const,
      acquire(store: Store, options?: ModelOptions<Initial>) {
        const selection = definition(options);
        const release = selection[modelAcquire](store);
        return { model: store.get(selection), release };
      },
      remove(store: Store, options?: Pick<ModelOptions<Initial>, 'key'>) {
        const key = options?.key === undefined ? 'default' : `key:${encodeKey(options.key)}`;
        const registry = store.get($registry);
        const entry = registry.models.get(definition)?.get(key);
        if (!entry || entry.owners.size) return false;
        evict(registry, definition, key, entry, store);
        return true;
      },
    },
  );
  return definition;
}

function scheduleEviction(
  registry: Registry,
  definition: object,
  key: string,
  entry: Entry,
  store: Store,
  gcTime: number,
) {
  const registryRef = new WeakRef(registry);
  const definitionRef = new WeakRef(definition);
  const entryRef = new WeakRef(entry);
  const storeRef = new WeakRef(store);
  const deadline = Date.now() + gcTime;
  const expire = () => {
    const current = entryRef.deref();
    const registry = registryRef.deref();
    const definition = definitionRef.deref();
    const store = storeRef.deref();
    if (!current || !registry || !definition || !store) return;
    const remaining = deadline - Date.now();
    if (remaining > 0) current.timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
    else evict(registry, definition, key, current, store);
  };
  entry.timer = setTimeout(expire, Math.min(gcTime, 2_147_483_647));
}

function evict(registry: Registry, definition: object, key: string, entry: Entry, store: Store) {
  const entries = registry.models.get(definition);
  if (entry.owners.size || entries?.get(key) !== entry) return;
  if (entry.timer !== undefined) clearTimeout(entry.timer);
  delete entry.timer;
  delete entry.retained;
  entries.delete(key);
  registry.collected.unregister(entry);
  store.set(entry.revision, (n) => n + 1);
}

function encodeKey(key: ModelKey): string {
  if (!Array.isArray(key)) throw new TypeError('createModel: key must be an array.');
  const ancestors = new Set<object>();
  const encode = (value: ModelKeyPart): string => {
    if (value === null) return 'null';
    if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
    if (
      typeof value !== 'object' ||
      value === null ||
      (!Array.isArray(value) &&
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null)
    )
      throw new TypeError('createModel: key contains an unsupported value.');
    if (ancestors.has(value)) throw new TypeError('createModel: key contains a cycle.');
    ancestors.add(value);
    try {
      if (Array.isArray(value)) return `[${Array.from(value, (item) => encode(item)).join(',')}]`;
      return `{${Object.keys(value)
        .sort()
        .map(
          (name) =>
            `${JSON.stringify(name)}:${encode((value as Record<string, ModelKeyPart>)[name]!)}`,
        )
        .join(',')}}`;
    } finally {
      ancestors.delete(value);
    }
  };
  return encode(key);
}

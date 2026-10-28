import { atom, createStore, type PrimitiveAtom } from 'jotai/vanilla';
import { expect, expectTypeOf, test, vi } from 'vitest';
import {
  createShipmentDefinition,
  createShipmentSummary,
  modelTrackingFeed,
} from '../examples/model-composition.js';
import { actionAtom } from '../src/action-atom.js';
import { modelAnalytics } from '../src/analytics.js';
import {
  pipe,
  modelRegistry,
  modelLifecycle,
  modelConnection,
  type ModelDefinition,
  type ModelSource,
} from '../src/model.js';

function createDraft(initial: { id: string }) {
  const $text = atom(initial.id);
  const loaded = actionAtom((_get, set, value: string) => set($text, value));
  return { $text, loaded };
}
type Draft = ReturnType<typeof createDraft>;
type Initial = Parameters<typeof createDraft>[0];

function modelAudit(log: (id: string) => () => void) {
  return <Model extends Draft, Input extends Initial>(source: ModelSource<Model, Input>) =>
    pipe(
      source,
      modelConnection((model, { store, initial }) => {
        expectTypeOf(initial.id).toEqualTypeOf<string>();
        expectTypeOf(store.get(model.$text)).toEqualTypeOf<string>();
        return log(initial.id);
      }),
    );
}

test('custom modifiers share existing records and connect only while owned', () => {
  const stop = vi.fn();
  const log = vi.fn(() => stop);
  const $$base = pipe(createDraft, modelRegistry({ initial: { id: 'default' } }));
  const $$audited = pipe($$base, modelAudit(log));
  const store = createStore();
  expect(store.get($$audited())).toBe(store.get($$base()));
  expect(log).not.toHaveBeenCalled();
  const first = $$audited.acquire(store, { key: ['draft'], initial: { id: '42' } });
  const second = $$audited.acquire(store, { key: ['draft'] });
  expect(first.model).toBe(second.model);
  expect(log).toHaveBeenCalledExactlyOnceWith('42');
  first.release();
  expect(stop).not.toHaveBeenCalled();
  second.release();
  second.release();
  expect(stop).toHaveBeenCalledTimes(1);
});

test('connection modifiers roll back earlier setup when a later setup fails', () => {
  const stop = vi.fn();
  const $$draft = pipe(
    createDraft,
    modelRegistry({ initial: { id: 'default' } }),
    modelConnection(() => stop),
    modelConnection(() => {
      throw new Error('offline');
    }),
  );
  const store = createStore();
  expect(() => $$draft.acquire(store)).toThrow('offline');
  expect(stop).toHaveBeenCalledTimes(1);
  expect($$draft.remove(store)).toBe(true);
});

// Compiled under strict; never run these deliberately invalid calls.
function typeChecks() {
  const $$summary = pipe(
    createShipmentSummary,
    modelRegistry(),
    modelTrackingFeed({ subscribe: () => () => {} }),
  );
  expectTypeOf($$summary).toEqualTypeOf<
    ModelDefinition<ReturnType<typeof createShipmentSummary>, { shipmentId: string }>
  >();
  const createExtendedDraft = (initial: Initial & { locale: 'en' | 'ru' }) => ({
    ...createDraft(initial),
    $locale: atom(initial.locale),
  });
  const $$observedExtended = pipe(
    createExtendedDraft,
    modelAnalytics(() => (_model: Draft) => ({})),
    modelConnection((_model: Draft) => {}),
  );
  expectTypeOf($$observedExtended).toEqualTypeOf<
    ModelDefinition<ReturnType<typeof createExtendedDraft>, Initial & { locale: 'en' | 'ru' }>
  >();
  const asText = pipe(
    1,
    (value) => String(value),
    (value) => value.length,
  );
  expectTypeOf(asText).toEqualTypeOf<number>();
  // @ts-expect-error Registry defaults must supply all required creation fields.
  pipe(createExtendedDraft, modelRegistry({ initial: { id: '42' } }));
  const $$extended = pipe(
    createExtendedDraft,
    modelAudit(() => () => {}),
  );
  expectTypeOf($$extended).toEqualTypeOf<
    ModelDefinition<ReturnType<typeof createExtendedDraft>, Initial & { locale: 'en' | 'ru' }>
  >();
  // @ts-expect-error Reusable modifiers preserve extra initial fields too.
  $$extended({ initial: { id: '42', locale: 'de' } });
  const $$draft = pipe(
    createDraft,
    modelRegistry({ initial: { id: 'default' } }),
    modelLifecycle({
      load: ({ initial }) => Promise.resolve(initial.id),
      restore: (model) => model.loaded,
      snapshot: (model) => model.$text,
      save: ({ snapshot }) => {
        expectTypeOf(snapshot).toEqualTypeOf<string>();
      },
    }),
    modelAudit(() => () => {}),
    modelAnalytics(() => (model) => {
      expectTypeOf(model).toEqualTypeOf<Draft>();
      return {};
    }),
    modelConnection((model, { initial }) => {
      expectTypeOf(initial).toEqualTypeOf<Initial>();
      expectTypeOf(model.$text).toEqualTypeOf<Draft['$text']>();
    }),
    modelAudit(() => () => {}),
    modelConnection(() => {}),
  );
  expectTypeOf($$draft).toEqualTypeOf<ModelDefinition<Draft, Initial>>();
  const store = createStore();
  const model = store.get($$draft());
  expectTypeOf(model).toEqualTypeOf<Draft>();
  // @ts-expect-error Initial remains typed after eight modifiers.
  $$draft({ initial: { id: 42 } });
  // @ts-expect-error Atom writes still require a string.
  store.set(model.$text, 42);
  // @ts-expect-error Action arguments remain typed.
  store.set(model.loaded, false);
  // @ts-expect-error No modifier invents a field.
  model.missing;
  // @ts-expect-error Setup cannot return an async cleanup.
  modelConnection(async () => () => {});
  // @ts-expect-error Incompatible custom modifiers cannot consume this model.
  pipe(
    createDraft,
    modelConnection((model: { $count: PrimitiveAtom<number> }) => {}),
  );
}
void typeChecks;

test('the documented tracking modifier isolates keys and stores and stops the feed', () => {
  const receivers: ((status: 'delivered') => void)[] = [];
  const stop = vi.fn();
  const subscribe = vi.fn((_id: string, receive: (status: 'delivered') => void) => {
    receivers.push(receive);
    return stop;
  });
  const $$shipment = createShipmentDefinition({ subscribe });
  const store = createStore();
  const other = createStore();
  const select = { key: ['shipment', '42'], initial: { shipmentId: '42' } };
  store.get($$shipment(select));
  expect(subscribe).not.toHaveBeenCalled();
  const first = $$shipment.acquire(store, select);
  const second = $$shipment.acquire(store, select);
  const isolated = $$shipment.acquire(other, select);
  expect(subscribe).toHaveBeenCalledTimes(2);
  receivers[0]!('delivered');
  expect(store.get(first.model.$status)).toBe('delivered');
  expect(other.get(isolated.model.$status)).toBe('preparing');
  first.release();
  expect(stop).not.toHaveBeenCalled();
  second.release();
  expect(stop).toHaveBeenCalledTimes(1);
  isolated.release();
  expect(stop).toHaveBeenCalledTimes(2);
});

import { expect, test } from 'vitest';
import { bond, stateAtom } from '../src/vanilla.js';
import * as modelApi from '../src/model.js';
import { holo } from '../src/holo.js';
import { createModel } from '../src/model-registry.js';
import { createFormModel, holoForm } from '../src/rhf.js';

const view = () => null;

test.each([
  'core',
  'state',
  'actions',
  'bindProps',
  'props',
  'staticProps',
  'inputProps',
  'cage',
  'model',
  'lifecycle',
  'resources',
])('rejects retired holo field %s, including on the form adapter', (field) => {
  const config = { view, [field]: {} };
  expect(() => Reflect.apply(holo, undefined, [config])).toThrow(`unsupported field "${field}"`);
  expect(() => Reflect.apply(holoForm, undefined, [config])).toThrow(
    `unsupported field "${field}"`,
  );
});

test('rejects retired model options rather than silently changing resource ownership or retention', () => {
  for (const field of ['gcTime', 'connect'])
    expect(() =>
      Reflect.apply(createModel, undefined, [{ create: () => ({}), [field]: 0 }]),
    ).toThrow('use retainTime and resources');
  expect(() => Reflect.apply(createFormModel, undefined, [{ gcTime: 0 }])).toThrow('modelRegistry');
});

function typeChecks() {
  // @ts-expect-error Only the canonical holo configuration is supported.
  holo({ core: view });
  // @ts-expect-error The new API cannot be mixed with the retired one.
  holo({ view, state: {} });
  // @ts-expect-error Static View props use static.
  holo({ view, props: {} });
  // @ts-expect-error Committed prop forwarding uses input.
  holo({ view, inputProps: {} });
  // @ts-expect-error The longer staticProps name is not an alias.
  holo({ view, staticProps: {} });
  // @ts-expect-error Form adapters use the same canonical prop names.
  holoForm({ view, props: {} });
  // @ts-expect-error Model connections belong in resources.
  createModel({ create: () => ({}), connect: () => () => {} });
  // @ts-expect-error Retention is configured through retainTime.
  createModel({ create: () => ({}), gcTime: 0 });
  // @ts-expect-error Form adapters select a control from named models.
  holoForm({ view, model: createFormModel({ initial: {}, options: () => ({}) }) });
}
void typeChecks;

test('the public model entry exposes composition, not a second registry constructor', () => {
  expect(Object.keys(modelApi).sort()).toEqual([
    'defineModel',
    'modelConnection',
    'modelLifecycle',
    'modelRegistry',
    'pipe',
  ]);
});

test('retired bond and registry options fail instead of changing behavior silently', () => {
  expect(() =>
    Reflect.apply(bond, undefined, [{ trigger: stateAtom(0), yield: stateAtom(0) }]),
  ).toThrow('use write');
  for (const field of ['gcTime', 'connect', 'resources']) {
    expect(() => Reflect.apply(modelApi.modelRegistry, undefined, [{ [field]: 0 }])).toThrow(
      'unsupported field',
    );
  }
});

function retiredTypes() {
  // @ts-expect-error bond uses write, not yield.
  bond({ trigger: stateAtom(0), yield: stateAtom(0) });
  // @ts-expect-error bond uses trigger, not action.
  bond({ action: stateAtom(0), write: stateAtom(0) });
  // @ts-expect-error createModel is internal, not a public model API.
  modelApi.createModel;
}
void retiredTypes;

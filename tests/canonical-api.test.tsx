import { expect, test } from 'vitest';
import { holo } from '../src/holo.js';
import { createModel } from '../src/model.js';
import { createFormModel, holoForm } from '../src/rhf.js';

const view = () => null;

test.each(['core', 'state', 'actions', 'bindProps', 'cage', 'model', 'lifecycle', 'resources'])(
  'rejects retired holo field %s, including on the form adapter',
  (field) => {
    const config = { view, [field]: {} };
    expect(() => Reflect.apply(holo, undefined, [config])).toThrow(`unsupported field "${field}"`);
    expect(() => Reflect.apply(holoForm, undefined, [config])).toThrow(
      `unsupported field "${field}"`,
    );
  },
);

test('rejects retired model options rather than silently changing resource ownership or retention', () => {
  for (const field of ['gcTime', 'connect'])
    expect(() =>
      Reflect.apply(createModel, undefined, [{ create: () => ({}), [field]: 0 }]),
    ).toThrow('use retainTime and resources');
  expect(() => Reflect.apply(createFormModel, undefined, [{ gcTime: 0 }])).toThrow('modelRegistry');
});

function typeChecks() {
  // @ts-expect-error Only view/read/write/props/models/lifecycle are supported.
  holo({ core: view });
  // @ts-expect-error The new API cannot be mixed with the retired one.
  holo({ view, state: {} });
  // @ts-expect-error Model connections belong in resources.
  createModel({ create: () => ({}), connect: () => () => {} });
  // @ts-expect-error Retention is configured through retainTime.
  createModel({ create: () => ({}), gcTime: 0 });
  // @ts-expect-error Form adapters select a control from named models.
  holoForm({ view, model: createFormModel({ initial: {}, options: () => ({}) }) });
}
void typeChecks;

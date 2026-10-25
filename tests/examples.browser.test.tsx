import { act } from 'react';
import { Provider } from 'jotai';
import {
  createInjector,
  InjectorProvider,
  useMolecule,
  type MoleculeOrInterface,
} from 'bunshi/react';
import { expect, test } from 'vitest';
import { OperatorsExample } from '../examples/operators.js';
import { BasicCounter } from '../examples/basic.js';
import { EffectCounter } from '../examples/effect.js';
import { BunshiCounters } from '../examples/bunshi.js';
import { BunshiEffectCounter, CounterRuntime } from '../examples/bunshi-effect.js';
import { createHarness } from './browser-harness.js';

test('runnable basic and effect examples respond to their rendered controls', async () => {
  const h = createHarness();
  await h.render(
    <Provider>
      <BasicCounter />
      <EffectCounter />
    </Provider>,
  );
  const buttons = h.container.querySelectorAll('button');
  await act(async () => {
    buttons[1]?.click();
    buttons[2]?.click();
  });
  expect(h.container.textContent).toContain('1 × 2 = 2');
  expect(h.container.textContent).toContain('Observed count: 1');
});

test('runnable Bunshi example updates both shared cores and leaves the other scope alone', async () => {
  const injector = createInjector();
  const h = createHarness();
  await h.render(
    <InjectorProvider value={() => injector}>
      <Provider>
        <BunshiCounters />
      </Provider>
    </InjectorProvider>,
  );
  await act(async () => {
    h.container.querySelectorAll('button')[1]?.click();
  });
  expect([...h.container.querySelectorAll('output')].map((n) => n.textContent)).toEqual([
    '1 × 2 = 2',
    '1 × 2 = 2',
    '0 × 2 = 0',
  ]);
});

test('combined Bunshi/store/observe example disposes the effect with its molecule', async () => {
  const injector = createInjector();
  let runtime:
    | (typeof CounterRuntime extends MoleculeOrInterface<infer Model> ? Model : never)
    | undefined;
  // Capture the same model instance as the recipe's two consumers.
  function Probe() {
    runtime = useMolecule(CounterRuntime);
    return null;
  }
  const h = createHarness();
  await h.render(
    <InjectorProvider value={() => injector}>
      <Probe />
      <BunshiEffectCounter />
    </InjectorProvider>,
  );
  await act(async () => {
    h.container.querySelector('button')?.click();
  });
  expect(h.container.textContent).toContain('default: observed 1');
  if (!runtime) throw new Error('Missing runtime');
  const model = runtime;
  await h.unmount();
  model.store.set(model.increment);
  expect(model.store.get(model.$count)).toBe(2);
  expect(model.store.get(model.$message)).toBe('default: observed 1');
});

test('operator example connects events and updates projected list and branch state', async () => {
  const h = createHarness();
  await h.render(
    <Provider>
      <OperatorsExample />
    </Provider>,
  );
  expect(h.container.textContent).toContain('No users yet.');
  await act(async () => h.container.querySelector('button')!.click());
  await act(async () => h.container.querySelector('button')!.click());
  expect(h.container.textContent).toContain('Users: 2');
  expect([...h.container.querySelectorAll('li')].map((node) => node.textContent)).toEqual([
    'User 1',
    'User 2',
  ]);
});

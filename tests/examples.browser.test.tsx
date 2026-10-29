import { act } from 'react';
import { createStore, Provider } from 'jotai';
import { expect, test } from 'vitest';
import { OperatorsExample } from '../examples/operators.js';
import { BasicCounter } from '../examples/basic.js';
import { EffectCounter } from '../examples/effect.js';
import { ModelCounters } from '../examples/models.js';
import { ModelEffectCounter, $$counterRuntime } from '../examples/model-effect.js';
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
  await act(async () => buttons[0]?.click());
  expect(h.container.querySelector('output')?.textContent).toBe('0 × 2 = 0');
  await act(async () => {
    buttons[1]?.click();
    buttons[2]?.click();
  });
  expect(h.container.textContent).toContain('1 × 2 = 2');
  expect(h.container.textContent).toContain('Reward tokens: 1');
});

test('keyed model example shares two Views and isolates the third', async () => {
  const h = createHarness();
  await h.render(
    <Provider>
      <ModelCounters />
    </Provider>,
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

test('shared model effect survives one owner and stops after the final owner', async () => {
  const store = createStore();
  const h = createHarness();
  const render = (two: boolean) =>
    h.render(
      <Provider store={store}>
        <ModelEffectCounter key="first" />
        {two && <ModelEffectCounter key="second" />}
      </Provider>,
    );
  await render(true);
  const model = store.get($$counterRuntime());
  await act(async () => {
    store.set(model.increment);
  });
  expect(store.get(model.$message)).toBe('Reward tokens: 1');
  await render(false);
  await act(async () => {
    store.set(model.increment);
  });
  expect(store.get(model.$message)).toBe('Reward tokens: 2');
  await h.unmount();
  store.set(model.increment);
  expect(store.get(model.$count)).toBe(3);
  expect(store.get(model.$message)).toBe('Reward tokens: 2');
});

test('operator example connects events and updates projected list and branch state', async () => {
  const h = createHarness();
  await h.render(
    <Provider>
      <OperatorsExample />
    </Provider>,
  );
  expect(h.container.textContent).toContain('No friends yet.');
  await act(async () => h.container.querySelector('button')!.click());
  await act(async () => h.container.querySelector('button')!.click());
  expect(h.container.textContent).toContain('Friends: 2');
  expect([...h.container.querySelectorAll('li')].map((node) => node.textContent)).toEqual([
    'Player 1',
    'Player 2',
  ]);
});

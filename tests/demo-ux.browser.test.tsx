import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { expect, test, vi } from 'vitest';
import WishlistDemo from '../examples/docs/list.js';
import OrderReview from '../examples/docs/operators.js';
import { createHarness } from './browser-harness.js';

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join('') }),
}));

test('a cleared wishlist can be restored without remounting the example', async () => {
  const h = createHarness();
  await h.render(
    <Provider store={createStore()}>
      <WishlistDemo />
    </Provider>,
  );
  const buttons = () => [...h.container.querySelectorAll('button')];
  await act(async () =>
    buttons()
      .find((b) => b.textContent === 'Clear wishlist')!
      .click(),
  );
  expect(h.container.textContent).toContain('Your wishlist is empty.');
  expect(buttons()[0]!.disabled).toBe(true);
  await act(async () =>
    buttons()
      .find((b) => b.textContent === 'Restore wishlist')!
      .click(),
  );
  expect(h.container.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
  expect(buttons()[0]!.disabled).toBe(false);
  await h.unmount();
});

test('purchase eligibility explains the required input and announces readiness', async () => {
  const h = createHarness();
  await h.render(
    <Provider store={createStore()}>
      <OrderReview />
    </Provider>,
  );
  const status = h.container.querySelector('[role=status]')!;
  expect(status.textContent).toContain('Choose payment');
  const select = h.container.querySelector('select')!;
  await act(async () => {
    select.value = 'wallet';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    h.container.querySelector<HTMLInputElement>('input')!.click();
  });
  expect(status.textContent).toBe('Ready to place your order.');
  expect(h.container.querySelector('button')).toBeNull();
  await h.unmount();
});

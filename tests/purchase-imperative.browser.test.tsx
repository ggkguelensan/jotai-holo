import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import PurchaseDemo, {
  purchaseApi,
  setup,
  type Receipt,
} from '../examples/docs/imperative-purchase.js';
import { createHarness, deferred } from './browser-harness.js';

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join('') }),
}));
afterEach(() => vi.restoreAllMocks());

const receipt: Receipt = { orderId: 'P-42', title: 'Starfall', total: 25 };
async function renderPurchase() {
  const store = createStore();
  setup(store);
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <PurchaseDemo />
    </Provider>,
  );
  const buttons = h.container.querySelectorAll('button');
  return {
    h,
    buy: buttons[0]!,
    panel: h.container.querySelector<HTMLElement>('.demo-receipt')!,
  };
}

test('the visible status panel follows the purchase and animates only success', async () => {
  const response = deferred<Receipt>();
  const transport = vi.spyOn(purchaseApi, 'create').mockReturnValue(response.promise);
  const { buy, panel } = await renderPurchase();
  const animate = vi.spyOn(panel, 'animate');
  expect(panel.textContent).toContain('Ready to purchase');
  expect(animate).not.toHaveBeenCalled();
  await act(async () => buy.click());
  expect(buy.disabled).toBe(true);
  expect(panel.textContent).toContain('Completing purchase…');
  expect(animate).not.toHaveBeenCalled();
  await act(async () => response.resolve(receipt));
  expect(panel.textContent).toContain('Purchase complete');
  expect(panel.textContent).toContain('P-42');
  expect(animate).toHaveBeenCalledTimes(1);
  expect(transport).toHaveBeenCalledTimes(1);
});

test('a rejected purchase shows the mutation error in the same visible panel', async () => {
  const response = deferred<Receipt>();
  vi.spyOn(purchaseApi, 'create').mockReturnValue(response.promise);
  const { buy, panel } = await renderPurchase();
  const animate = vi.spyOn(panel, 'animate');
  await act(async () => buy.click());
  await act(async () => response.reject(new Error('Payment declined')));
  expect(panel.querySelector('[role=alert]')?.textContent).toBe('Purchase failed. Try again.');
  expect(animate).not.toHaveBeenCalled();
});

test('a purchase completing after unmount cannot call the departed View', async () => {
  const response = deferred<Receipt>();
  vi.spyOn(purchaseApi, 'create').mockReturnValue(response.promise);
  const { h, buy, panel } = await renderPurchase();
  const animate = vi.spyOn(panel, 'animate');
  await act(async () => buy.click());
  await h.unmount();
  await act(async () => response.resolve(receipt));
  expect(animate).not.toHaveBeenCalled();
});

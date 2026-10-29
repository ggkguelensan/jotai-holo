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
    reopen: buttons[1]!,
    dialog: h.container.querySelector('dialog')!,
  };
}

test('a successful purchase opens its receipt; the local button reopens it independently', async () => {
  const response = deferred<Receipt>();
  const transport = vi.spyOn(purchaseApi, 'create').mockReturnValue(response.promise);
  const { buy, reopen, dialog } = await renderPurchase();
  expect(reopen.disabled).toBe(true);
  await act(async () => buy.click());
  expect(buy.disabled).toBe(true);
  expect(dialog.open).toBe(false);
  await act(async () => response.resolve(receipt));
  expect(dialog.open).toBe(true);
  expect(dialog.textContent).toContain('P-42');
  expect(reopen.disabled).toBe(false);
  await act(async () => dialog.close());
  await act(async () => reopen.click());
  expect(dialog.open).toBe(true);
  expect(transport).toHaveBeenCalledTimes(1);
});

test('a rejected purchase shows the mutation error without opening a receipt', async () => {
  const response = deferred<Receipt>();
  vi.spyOn(purchaseApi, 'create').mockReturnValue(response.promise);
  const { h, buy, reopen, dialog } = await renderPurchase();
  await act(async () => buy.click());
  await act(async () => response.reject(new Error('Payment declined')));
  expect(dialog.open).toBe(false);
  expect(reopen.disabled).toBe(true);
  expect(h.container.querySelector('[role=alert]')?.textContent).toBe(
    'Purchase failed. Try again.',
  );
});

test('a purchase completing after unmount cannot call the departed View', async () => {
  const response = deferred<Receipt>();
  vi.spyOn(purchaseApi, 'create').mockReturnValue(response.promise);
  const { h, buy, dialog } = await renderPurchase();
  const open = vi.spyOn(dialog, 'showModal');
  await act(async () => buy.click());
  await h.unmount();
  await act(async () => response.resolve(receipt));
  expect(open).not.toHaveBeenCalled();
});

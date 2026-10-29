import { captureEvent } from './event-harness.js';
import { QueryClient } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { queryClientAtom } from '../src/query.js';
import { createHarness, deferred } from './browser-harness.js';
import { giftOrderDetailQO, type GiftOrder } from '../examples/recipes/gift-order-api.js';
import { createGiftOrderModel } from '../examples/recipes/gift-order-model.js';
import { $$giftOrders, KeyedGiftOrderEditor } from '../examples/recipes/gift-order-registry.js';
import { createSavingGiftOrderModel } from '../examples/recipes/gift-order-mutation.js';
import { ServerGiftOrderForm } from '../examples/recipes/gift-order-form.js';
import {
  createLocalGiftOrderModel,
  $$localGiftOrders,
} from '../examples/recipes/gift-order-local.js';

const giftOrder: GiftOrder = {
  id: 'P-1042',
  recipientGroup: 'Atlas',
  copyPrice: 25,
  copies: 5,
  comment: 'Server',
};
function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const store = createStore();
  store.set(queryClientAtom, client);
  for (const id of ['P-1042', 'P-2048'])
    client.setQueryData(giftOrderDetailQO({ giftOrderId: id }).queryKey, { ...giftOrder, id });
  return { client, store };
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
afterEach(() => vi.restoreAllMocks());

test('server recipe adopts refreshes before editing and preserves local edits afterwards', async () => {
  const { store, client } = setup();
  const model = createGiftOrderModel({ giftOrderId: giftOrder.id });
  const stop = store.sub(model.$draft, () => {});
  expect(store.get(model.$draft)?.copies).toBe(5);
  const key = giftOrderDetailQO({ giftOrderId: giftOrder.id }).queryKey;
  client.setQueryData(key, { ...giftOrder, copies: 6 });
  await expect.poll(() => store.get(model.$draft)?.copies).toBe(6);
  store.set(model.$draft, { copies: 8, comment: 'Local' });
  client.setQueryData(key, { ...giftOrder, copies: 20, copyPrice: 30 });
  const totalStop = store.sub(model.$total, () => {});
  await expect.poll(() => store.get(model.$total)).toBe(240);
  expect(store.get(model.$draft)).toEqual({ copies: 8, comment: 'Local' });
  totalStop();
  stop();
  client.clear();
});

test('registry recipe shares drafts by editor key without merging different giftOrders', async () => {
  const { store, client } = setup();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <KeyedGiftOrderEditor giftOrderId="P-1042" />
      <KeyedGiftOrderEditor giftOrderId="P-1042" />
      <KeyedGiftOrderEditor giftOrderId="P-2048" />
    </Provider>,
  );
  const selected = (id: string) =>
    $$giftOrders({
      key: ['gift-order-editor', id],
      initial: { giftOrderId: id },
    });
  const first = store.get(selected('P-1042'));
  expect(store.get(selected('P-1042'))).toBe(first);
  await act(async () => {
    store.set(first.$draft, { copies: 9, comment: 'Shared' });
  });
  const inputs = [...h.container.querySelectorAll('input')];
  expect(inputs.map((input) => input.value)).toEqual(['9', '9', '5']);
  await h.unmount();
  client.clear();
});

test('mutation recipe captures submission, deduplicates Save and emits only accepted facts', async () => {
  const { store, client } = setup();
  const model = createSavingGiftOrderModel({ giftOrderId: giftOrder.id });
  const stop = store.sub(model.$draft, () => {});
  const gate = deferred<void>();
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    await gate.promise;
    return Response.json({ ...giftOrder, copies: 7, comment: 'Submitted' });
  });
  const facts: GiftOrder[] = [];
  const stopFacts = captureEvent(store, model.giftOrderSaved, (fact) => facts.push(fact));
  store.set(model.$draft, { copies: 7, comment: 'Submitted' });
  const pending = store.set(model.save);
  await store.set(model.save);
  store.set(model.$draft, { copies: 8, comment: 'Newer edit' });
  gate.resolve();
  await pending;
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
    copies: 7,
    comment: 'Submitted',
  });
  expect(
    client.getQueryData(giftOrderDetailQO({ giftOrderId: giftOrder.id }).queryKey),
  ).toMatchObject({ copies: 7 });
  expect(store.get(model.$draft)?.copies).toBe(8);
  expect(facts).toHaveLength(1);
  fetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));
  await store.set(model.save);
  expect(store.get(model.saving.$error)).toBeInstanceOf(Error);
  expect(facts).toHaveLength(1);
  stopFacts();
  stop();
  client.clear();
});

test('RHF recipe starts with server defaults, isolates tabs and retains edits across refresh/remount', async () => {
  const { store, client } = setup();
  const options = giftOrderDetailQO({ giftOrderId: giftOrder.id });
  client.removeQueries({ queryKey: options.queryKey });
  const response = deferred<Response>();
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => response.promise);
  const h = createHarness();
  const editors = (
    <Provider store={store}>
      <ServerGiftOrderForm editorId="tab-a" />
      <ServerGiftOrderForm editorId="tab-b" />
    </Provider>
  );
  await h.render(editors);
  expect(h.container.querySelectorAll('input')).toHaveLength(0);
  expect(h.container.textContent).toContain('Loading gift order');
  await act(async () => {
    response.resolve(Response.json(giftOrder));
    await client.ensureQueryData(options);
    await pause();
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  const first = h.container.querySelector('input')!;
  expect([...h.container.querySelectorAll('input')].map((input) => input.value)).toEqual([
    '5',
    '5',
  ]);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(first, '8');
    first.dispatchEvent(new Event('input', { bubbles: true }));
    first.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => {
    client.setQueryData(giftOrderDetailQO({ giftOrderId: giftOrder.id }).queryKey, {
      ...giftOrder,
      copies: 99,
    });
    await pause();
  });
  expect([...h.container.querySelectorAll('input')].map((input) => input.value)).toEqual([
    '8',
    '5',
  ]);
  await h.render(null);
  await h.render(editors);
  expect([...h.container.querySelectorAll('input')].map((input) => input.value)).toEqual([
    '8',
    '5',
  ]);
  await h.unmount();
  client.clear();
});

test('local recipes restore and flush drafts with explicit or registry ownership', async () => {
  const { store, client } = setup();
  const firstKey = 'gift-order-draft:P-1042';
  const secondKey = 'gift-order-draft:P-2048';
  localStorage.setItem(firstKey, JSON.stringify({ copies: 6, comment: 'Restored' }));
  localStorage.removeItem(secondKey);
  const model = createLocalGiftOrderModel({ giftOrderId: 'P-1042' });
  const stopDraft = store.sub(model.$draft, () => {});
  const stopDisk = model.disk.connect(store);
  const lease = $$localGiftOrders.acquire(store, {
    key: ['local-giftOrder', 'P-2048'],
    initial: { giftOrderId: 'P-2048' },
  });
  try {
    await expect.poll(() => store.get(model.disk.$restoring)).toBe(false);
    await expect.poll(() => store.get(lease.model.disk.$restoring)).toBe(false);
    expect(store.get(model.$draft)?.copies).toBe(6);
    store.set(model.$draft, { copies: 8, comment: 'Local A' });
    store.set(lease.model.$draft, { copies: 9, comment: 'Local B' });
    await Promise.all([store.set(model.disk.flush), store.set(lease.model.disk.flush)]);
    expect(JSON.parse(localStorage.getItem(firstKey)!)).toEqual({ copies: 8, comment: 'Local A' });
    expect(JSON.parse(localStorage.getItem(secondKey)!)).toEqual({ copies: 9, comment: 'Local B' });
    expect(
      client.getQueryData(giftOrderDetailQO({ giftOrderId: 'P-1042' }).queryKey),
    ).toMatchObject({
      copies: 5,
    });
  } finally {
    if (typeof stopDisk === 'function') stopDisk();
    stopDraft();
    lease.release();
    client.clear();
    localStorage.removeItem(firstKey);
    localStorage.removeItem(secondKey);
  }
});

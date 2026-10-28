import { QueryClient } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { subscribeEvent } from '../src/vanilla.js';
import { queryClientAtom } from '../src/query.js';
import { createHarness, deferred } from './browser-harness.js';
import { proposalDetailQO, type Proposal } from '../examples/recipes/proposal-api.js';
import { createProposalModel } from '../examples/recipes/proposal-model.js';
import { $$proposals, KeyedProposalEditor } from '../examples/recipes/proposal-registry.js';
import { createSavingProposalModel } from '../examples/recipes/proposal-mutation.js';
import { ServerProposalForm } from '../examples/recipes/proposal-form.js';
import { createLocalProposalModel, $$localProposals } from '../examples/recipes/proposal-local.js';

const proposal: Proposal = {
  id: 'P-1042',
  customer: 'Atlas',
  seatPrice: 25,
  seats: 5,
  comment: 'Server',
};
function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const store = createStore();
  store.set(queryClientAtom, client);
  for (const id of ['P-1042', 'P-2048'])
    client.setQueryData(proposalDetailQO({ proposalId: id }).queryKey, { ...proposal, id });
  return { client, store };
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
afterEach(() => vi.restoreAllMocks());

test('server recipe adopts refreshes before editing and preserves local edits afterwards', async () => {
  const { store, client } = setup();
  const model = createProposalModel({ proposalId: proposal.id });
  const stop = store.sub(model.$draft, () => {});
  expect(store.get(model.$draft)?.seats).toBe(5);
  const key = proposalDetailQO({ proposalId: proposal.id }).queryKey;
  client.setQueryData(key, { ...proposal, seats: 6 });
  await expect.poll(() => store.get(model.$draft)?.seats).toBe(6);
  store.set(model.$draft, { seats: 8, comment: 'Local' });
  client.setQueryData(key, { ...proposal, seats: 20, seatPrice: 30 });
  const totalStop = store.sub(model.$total, () => {});
  await expect.poll(() => store.get(model.$total)).toBe(240);
  expect(store.get(model.$draft)).toEqual({ seats: 8, comment: 'Local' });
  totalStop();
  stop();
  client.clear();
});

test('registry recipe shares drafts by editor key without merging different proposals', async () => {
  const { store, client } = setup();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <KeyedProposalEditor proposalId="P-1042" />
      <KeyedProposalEditor proposalId="P-1042" />
      <KeyedProposalEditor proposalId="P-2048" />
    </Provider>,
  );
  const selected = (id: string) =>
    $$proposals({
      key: ['proposal-editor', id],
      initial: { proposalId: id },
    });
  const first = store.get(selected('P-1042'));
  expect(store.get(selected('P-1042'))).toBe(first);
  await act(async () => {
    store.set(first.$draft, { seats: 9, comment: 'Shared' });
  });
  const inputs = [...h.container.querySelectorAll('input')];
  expect(inputs.map((input) => input.value)).toEqual(['9', '9', '5']);
  await h.unmount();
  client.clear();
});

test('mutation recipe captures submission, deduplicates Save and emits only accepted facts', async () => {
  const { store, client } = setup();
  const model = createSavingProposalModel({ proposalId: proposal.id });
  const stop = store.sub(model.$draft, () => {});
  const gate = deferred<void>();
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    await gate.promise;
    return Response.json({ ...proposal, seats: 7, comment: 'Submitted' });
  });
  const facts: Proposal[] = [];
  const stopFacts = subscribeEvent(store, model.proposalSaved, (fact) => facts.push(fact));
  store.set(model.$draft, { seats: 7, comment: 'Submitted' });
  const pending = store.set(model.save);
  await store.set(model.save);
  store.set(model.$draft, { seats: 8, comment: 'Newer edit' });
  gate.resolve();
  await pending;
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
    seats: 7,
    comment: 'Submitted',
  });
  expect(client.getQueryData(proposalDetailQO({ proposalId: proposal.id }).queryKey)).toMatchObject(
    { seats: 7 },
  );
  expect(store.get(model.$draft)?.seats).toBe(8);
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
  const options = proposalDetailQO({ proposalId: proposal.id });
  client.removeQueries({ queryKey: options.queryKey });
  const response = deferred<Response>();
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => response.promise);
  const h = createHarness();
  const editors = (
    <Provider store={store}>
      <ServerProposalForm editorId="tab-a" />
      <ServerProposalForm editorId="tab-b" />
    </Provider>
  );
  await h.render(editors);
  expect(h.container.querySelectorAll('input')).toHaveLength(0);
  expect(h.container.textContent).toContain('Loading proposal');
  await act(async () => {
    response.resolve(Response.json(proposal));
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
    client.setQueryData(proposalDetailQO({ proposalId: proposal.id }).queryKey, {
      ...proposal,
      seats: 99,
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
  const firstKey = 'proposal-draft:P-1042';
  const secondKey = 'proposal-draft:P-2048';
  localStorage.setItem(firstKey, JSON.stringify({ seats: 6, comment: 'Restored' }));
  localStorage.removeItem(secondKey);
  const model = createLocalProposalModel({ proposalId: 'P-1042' });
  const stopDraft = store.sub(model.$draft, () => {});
  const stopDisk = model.disk.connect(store);
  const lease = $$localProposals.acquire(store, {
    key: ['local-proposal', 'P-2048'],
    initial: { proposalId: 'P-2048' },
  });
  try {
    await expect.poll(() => store.get(model.disk.$restoring)).toBe(false);
    await expect.poll(() => store.get(lease.model.disk.$restoring)).toBe(false);
    expect(store.get(model.$draft)?.seats).toBe(6);
    store.set(model.$draft, { seats: 8, comment: 'Local A' });
    store.set(lease.model.$draft, { seats: 9, comment: 'Local B' });
    await Promise.all([store.set(model.disk.flush), store.set(lease.model.disk.flush)]);
    expect(JSON.parse(localStorage.getItem(firstKey)!)).toEqual({ seats: 8, comment: 'Local A' });
    expect(JSON.parse(localStorage.getItem(secondKey)!)).toEqual({ seats: 9, comment: 'Local B' });
    expect(client.getQueryData(proposalDetailQO({ proposalId: 'P-1042' }).queryKey)).toMatchObject({
      seats: 5,
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

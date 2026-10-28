import { captureEvent } from './event-harness.js';
import { QueryClient } from '@tanstack/query-core';
import { createStore } from 'jotai/vanilla';
import { expect, test, vi } from 'vitest';
import * as models from '../examples/profile/profile-composition.js';
import { profileApi } from '../examples/profile/profile-api.js';

vi.mock('../examples/profile/profile-api.js', () => ({
  profileApi: { get: vi.fn(), save: vi.fn() },
}));
import {
  createProfileModel,
  emptyProfile,
  type Profile,
} from '../examples/profile/profile-model.js';
import { queryClientAtom } from '../src/query.js';

const serverProfile: Profile = {
  username: 'alex',
  avatarUrl: null,
  bio: 'Designer',
  interests: ['books'],
};
function setup() {
  const client = new QueryClient();
  const store = createStore();
  store.set(queryClientAtom, client);
  return { client, store };
}

test('profile rules and derived color work without a server or a form', () => {
  const store = createStore();
  const first = createProfileModel(emptyProfile);
  const second = createProfileModel(emptyProfile);
  const facts: Profile[] = [];
  const stop = captureEvent(store, first.profileChanged, (fact) => facts.push(fact));
  store.set(first.change, { username: ' alex ', interests: ['books'] });
  const color = store.get(first.$color);
  expect(color).toMatch(/^#[0-9a-f]{6}$/);
  expect(store.get(first.$profile)?.username).toBe('alex');
  store.set(first.change, { bio: 'Designer' });
  expect(store.get(first.$color)).toBe(color);
  expect(facts[0]?.bio).toBe('');
  expect(facts[1]?.bio).toBe('Designer');
  expect(store.get(second.$profile)).toEqual(emptyProfile);
  stop();
});

test('an existing business profile avoids querying and preserves model identity', () => {
  const { client, store } = setup();
  const get = vi.fn(async () => serverProfile);
  vi.mocked(profileApi.get).mockImplementation(get);
  vi.mocked(profileApi.save).mockImplementation(async (values) => values);
  const existing = models.$$profile.acquire(store, { initial: serverProfile });
  const editor = models.$$editor.acquire(store);
  expect(editor.model).toBe(existing.model);
  expect(store.get(editor.model.$profile)).toEqual(serverProfile);
  expect(get).not.toHaveBeenCalled();
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  editor.release();
  existing.release();
  client.clear();
});

test('cold loading fills the business model once and later cache updates keep edits', async () => {
  const { client, store } = setup();
  const get = vi.fn(async () => serverProfile);
  vi.mocked(profileApi.get).mockImplementation(get);
  vi.mocked(profileApi.save).mockImplementation(async (values) => values);
  expect(get).not.toHaveBeenCalled();
  const editor = models.$$editor.acquire(store);
  await vi.waitFor(() => expect(store.get(editor.model.$profile)).toEqual(serverProfile));
  expect(get).toHaveBeenCalledTimes(1);
  expect(client.getQueryCache().getAll()[0]?.getObserversCount()).toBe(0);
  store.set(editor.model.change, { username: 'local' });
  client.setQueryData(['profile', 'current'], { ...serverProfile, username: 'remote' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(store.get(editor.model.$profile)?.username).toBe('local');
  expect(client.getQueryCache().getAll()[0]?.getObserversCount()).toBe(0);
  editor.release();
  client.clear();
});

test('cached data initializes without a request and creation starts without Query', () => {
  const { client, store } = setup();
  client.setQueryData(['profile', 'current'], serverProfile);
  const get = vi.fn(async () => serverProfile);
  vi.mocked(profileApi.get).mockImplementation(get);
  vi.mocked(profileApi.save).mockImplementation(async (values) => values);
  const editor = models.$$editor.acquire(store);
  expect(store.get(editor.model.$profile)).toEqual(serverProfile);
  expect(get).not.toHaveBeenCalled();
  editor.release();
  const creating = models.$$profile.acquire(store, {
    key: ['new-profile'],
    initial: emptyProfile,
  });
  expect(store.get(creating.model.$profile)).toEqual(emptyProfile);
  expect(get).not.toHaveBeenCalled();
  creating.release();
  client.clear();
});

test('owners share loading and final release aborts observation and ignores a late result', async () => {
  const { client, store } = setup();
  let finish!: (profile: Profile) => void;
  let signal!: AbortSignal;
  const get = vi.fn((current: AbortSignal) => {
    signal = current;
    return new Promise<Profile>((resolve) => {
      finish = resolve;
    });
  });
  vi.mocked(profileApi.get).mockImplementation(get);
  vi.mocked(profileApi.save).mockImplementation(async (values) => values);
  const first = models.$$editor.acquire(store);
  const second = models.$$editor.acquire(store);
  expect(first.model).toBe(second.model);
  expect(get).toHaveBeenCalledTimes(1);
  first.release();
  expect(signal.aborted).toBe(false);
  second.release();
  expect(signal.aborted).toBe(true);
  finish(serverProfile);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(store.get(first.model.$profile)).toBeNull();
  client.clear();
});

test('save assembly publishes only accepted facts and connects them to the owned profile', async () => {
  const { client, store } = setup();
  const save = vi.fn(async (values: Profile) => ({ ...values, bio: 'Accepted' }));
  vi.mocked(profileApi.get).mockResolvedValue(serverProfile);
  vi.mocked(profileApi.save).mockImplementation(save);
  const editor = models.$$editor.acquire(store, { initial: serverProfile });
  const facts: Profile[] = [];
  const stop = captureEvent(store, models.profileSaved, (fact) => facts.push(fact));
  await store.set(models.save, { ...serverProfile, bio: 'Submitted' });
  expect(store.get(editor.model.$profile)?.bio).toBe('Accepted');
  expect(client.getQueryData(['profile', 'current'])).toMatchObject({ bio: 'Accepted' });
  expect(facts).toHaveLength(1);
  save.mockRejectedValueOnce(new Error('Unavailable'));
  await expect(store.set(models.save, serverProfile)).rejects.toThrow('Unavailable');
  expect(facts).toHaveLength(1);
  expect(store.get(editor.model.$profile)?.bio).toBe('Accepted');
  editor.release();
  save.mockResolvedValueOnce({ ...serverProfile, bio: 'Late response' });
  await store.set(models.save, { ...serverProfile, bio: 'After release' });
  expect(facts).toHaveLength(2);
  expect(store.get(editor.model.$profile)?.bio).toBe('Accepted');
  stop();
  client.clear();
});

test('module declarations keep profile instances and Query caches isolated by store', () => {
  const first = setup();
  const second = setup();
  first.client.setQueryData(['profile', 'current'], serverProfile);
  second.client.setQueryData(['profile', 'current'], { ...serverProfile, username: 'sam' });
  const a = models.$$editor.acquire(first.store);
  const b = models.$$editor.acquire(second.store);
  expect(first.store.get(a.model.$profile)?.username).toBe('alex');
  expect(second.store.get(b.model.$profile)?.username).toBe('sam');
  first.store.set(a.model.change, { username: 'changed' });
  expect(second.store.get(b.model.$profile)?.username).toBe('sam');
  a.release();
  b.release();
  first.client.clear();
  second.client.clear();
});

test('another input can fill the profile during loading and detach Query immediately', async () => {
  const { client, store } = setup();
  let finish!: (profile: Profile) => void;
  let signal!: AbortSignal;
  vi.mocked(profileApi.get).mockImplementation((current) => {
    signal = current;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const editor = models.$$editor.acquire(store);
  store.set(editor.model.receive, { ...serverProfile, username: 'local' });
  expect(signal.aborted).toBe(true);
  expect(client.getQueryCache().getAll()[0]?.getObserversCount()).toBe(0);
  finish(serverProfile);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(store.get(editor.model.$profile)?.username).toBe('local');
  editor.release();
  client.clear();
});

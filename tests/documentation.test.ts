import { captureEvent } from './event-harness.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'jotai/vanilla';
import { QueryClient } from '@tanstack/query-core';
import { createNotifications } from '../examples/documentation.js';
import { $$profile, $$profileMutation, save } from '../examples/profile/edit-save.js';
import { profileApi } from '../examples/profile/edit-api.js';
import type { Profile } from '../examples/profile/edit-model.js';
import { queryClientAtom } from '../src/query.js';

vi.mock('../examples/profile/edit-api.js', () => ({ profileApi: { save: vi.fn() } }));

const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient();
  const store = createStore();
  store.set(queryClientAtom, client);
  clients.push(client);
  return store;
}
afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  vi.clearAllMocks();
});

describe('documentation profile workflow', () => {
  const profile: Profile = { id: 'u1', name: 'Ada', email: 'ada@example.com' };
  it('publishes after success, skips duplicate saves and preserves newer draft edits', async () => {
    let resolve!: (profile: Profile) => void;
    vi.mocked(profileApi.save).mockImplementation(
      () =>
        new Promise<Profile>((done) => {
          resolve = done;
        }),
    );
    const notifications = createNotifications($$profile);
    const store = setup();
    const audit = vi.fn();
    const stopAudit = captureEvent(store, $$profile.profileSaved, audit);
    const stopNotifications = notifications.notifying.connect(store);
    store.set($$profile.$draft, { name: profile.name, email: profile.email });
    const saving = store.set(save);
    expect(store.get($$profileMutation.$saving)).toBe(true);
    expect(audit).not.toHaveBeenCalled();
    expect(store.get(notifications.$message)).toBe('');
    // Query invokes the mutation function asynchronously; allow it to start.
    await vi.waitFor(() => expect(profileApi.save).toHaveBeenCalledTimes(1));
    await store.set(save);
    expect(profileApi.save).toHaveBeenCalledTimes(1);
    store.set($$profile.$draft, { name: 'Grace', email: 'grace@example.com' });
    expect(vi.mocked(profileApi.save).mock.calls[0]?.[0]).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
    });
    resolve(profile);
    await saving;
    expect(store.get($$profile.$profile)).toEqual(profile);
    expect(store.get($$profile.$draft).name).toBe('Grace');
    expect(store.get($$profileMutation.$saving)).toBe(false);
    expect(audit).toHaveBeenCalledExactlyOnceWith(profile);
    expect(store.get(notifications.$message)).toBe('Saved Ada');
    stopAudit();
    stopNotifications();
    store.set($$profile.profileSaved, { ...profile, name: 'Grace' });
    expect(audit).toHaveBeenCalledTimes(1);
    expect(store.get(notifications.$message)).toBe('Saved Ada');
  });
  it('keeps failures in mutation state and emits no success fact', async () => {
    vi.mocked(profileApi.save).mockRejectedValue(new Error('Offline'));
    const store = setup();
    const audit = vi.fn();
    const stop = captureEvent(store, $$profile.profileSaved, audit);
    store.set($$profile.$draft, { name: 'Ada', email: 'ada@example.com' });
    await store.set(save);
    expect(store.get($$profileMutation.$error)?.message).toBe('Offline');
    expect(store.get($$profileMutation.$saving)).toBe(false);
    expect(audit).not.toHaveBeenCalled();
    stop();
  });
  it('does not invoke the mutation for invalid input', async () => {
    const store = setup();
    await store.set(save);
    expect(profileApi.save).not.toHaveBeenCalled();
    expect(store.get($$profile.$validationError)).toBe('Enter a name and a valid email.');
    expect(store.get($$profileMutation.$error)).toBeNull();
  });
  it('samples locale on the fact and respects the notification guard', () => {
    const notifications = createNotifications($$profile);
    const store = setup();
    const stop = notifications.notifying.connect(store);
    store.set(notifications.$locale, 'ru');
    store.set($$profile.profileSaved, profile);
    expect(store.get(notifications.$message)).toBe('Сохранён профиль Ada');
    store.set(notifications.$locale, 'en');
    store.set(notifications.$enabled, false);
    store.set($$profile.profileSaved, { ...profile, name: 'Grace' });
    expect(store.get(notifications.$message)).toBe('Сохранён профиль Ada');
    stop();
  });
  it('isolates module-level drafts and mutation state between stores', async () => {
    vi.mocked(profileApi.save).mockResolvedValue(profile);
    const first = setup();
    const second = setup();
    first.set($$profile.$draft, { name: 'Ada', email: 'ada@example.com' });
    await first.set(save);
    expect(second.get($$profile.$draft).name).toBe('');
    expect(second.get($$profileMutation.$error)).toBeNull();
    expect(second.get($$profile.$profile)).toBeNull();
  });
});

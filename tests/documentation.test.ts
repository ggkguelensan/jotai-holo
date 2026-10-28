import { describe, expect, it, vi } from 'vitest';
import { createStore } from 'jotai/vanilla';
import { subscribeEvent } from 'jotai-holo';
import { createNotifications, createProfile, type Profile } from '../examples/documentation.js';

describe('documentation profile workflow', () => {
  const profile: Profile = { id: 'u1', name: 'Ada', email: 'ada@example.com' };
  it('publishes a fact after persistence, not on request, and disposes reactions', async () => {
    let resolve!: (profile: Profile) => void;
    const api = {
      save: vi.fn(
        () =>
          new Promise<Profile>((done) => {
            resolve = done;
          }),
      ),
    };
    const model = createProfile(api);
    const notifications = createNotifications(model);
    const store = createStore();
    const audit = vi.fn();
    const stopAudit = subscribeEvent(store, model.profileSaved, audit);
    const stopNotifications = notifications.notifying.connect(store);
    store.set(model.edit, { name: profile.name, email: profile.email });
    const saving = store.set(model.save);
    expect(store.get(model.$saving)).toBe(true);
    expect(audit).not.toHaveBeenCalled();
    expect(store.get(notifications.$message)).toBe('');
    await store.set(model.save); // Explicit single-flight policy, no second API call.
    expect(api.save).toHaveBeenCalledTimes(1);
    resolve(profile);
    await saving;
    expect(store.get(model.$profile)).toEqual(profile);
    expect(store.get(model.$saving)).toBe(false);
    expect(audit).toHaveBeenCalledExactlyOnceWith(profile);
    expect(store.get(notifications.$message)).toBe('Saved Ada');
    stopAudit();
    stopNotifications();
    store.set(model.profileSaved, { ...profile, name: 'Grace' });
    expect(audit).toHaveBeenCalledTimes(1);
    expect(store.get(notifications.$message)).toBe('Saved Ada');
  });
  it('keeps failures in state and emits no success fact', async () => {
    const model = createProfile({
      save: async () => {
        throw new Error('Offline');
      },
    });
    const store = createStore();
    const audit = vi.fn();
    const stop = subscribeEvent(store, model.profileSaved, audit);
    store.set(model.edit, { name: 'Ada', email: 'ada@example.com' });
    await store.set(model.save);
    expect(store.get(model.$error)).toBe('Offline');
    expect(store.get(model.$saving)).toBe(false);
    expect(audit).not.toHaveBeenCalled();
    stop();
  });
  it('rejects invalid input before calling the API', async () => {
    const api = { save: vi.fn(async () => profile) };
    const model = createProfile(api);
    const store = createStore();
    await store.set(model.save);
    expect(api.save).not.toHaveBeenCalled();
    expect(store.get(model.$error)).toBe('Enter a name and a valid email.');
  });
  it('samples locale on the fact and respects the notification guard', () => {
    const model = createProfile({ save: async () => profile });
    const notifications = createNotifications(model);
    const store = createStore();
    const stop = notifications.notifying.connect(store);
    store.set(notifications.$locale, 'ru');
    expect(store.get(notifications.$message)).toBe('');
    store.set(model.profileSaved, profile);
    expect(store.get(notifications.$message)).toBe('Сохранён профиль Ada');
    store.set(notifications.$locale, 'en');
    store.set(notifications.$enabled, false);
    store.set(model.profileSaved, { ...profile, name: 'Grace' });
    expect(store.get(notifications.$message)).toBe('Сохранён профиль Ada');
    stop();
  });
});

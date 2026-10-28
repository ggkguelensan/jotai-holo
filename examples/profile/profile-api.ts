import type { Profile } from './profile-model.js';

// Example endpoints: replace with the application's API client.
export const profileApi = {
  async get(signal: AbortSignal): Promise<Profile> {
    const response = await fetch('/api/profile', { signal });
    if (!response.ok) throw new Error('Could not load profile');
    return response.json();
  },

  async save(profile: Profile): Promise<Profile> {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) throw new Error('Could not save profile');
    return response.json();
  },
};

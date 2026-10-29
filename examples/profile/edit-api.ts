import type { Profile, ProfileDraft } from './edit-model.js';

export const profileApi = {
  async save(draft: ProfileDraft): Promise<Profile> {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!response.ok) throw new Error('Could not save the profile.');
    return response.json();
  },
};

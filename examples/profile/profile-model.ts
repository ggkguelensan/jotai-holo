import { actionAtom, eventAtom, ion, stateAtom } from 'jotai-holo/vanilla';
import { defineModel } from 'jotai-holo/model';

// #region profile-contract
export type Profile = Readonly<{
  username: string;
  avatarUrl: string | null;
  bio: string;
  interests: readonly string[];
}>;

export const emptyProfile: Profile = {
  username: '',
  avatarUrl: null,
  bio: '',
  interests: [],
};

function usernameColor(username: string): string {
  let hash = 0;
  for (const character of username) {
    hash = (Math.imul(hash, 31) + character.codePointAt(0)!) | 0;
  }
  return `#${(hash & 0xffffff).toString(16).padStart(6, '0')}`;
}
// #endregion profile-contract

// #region profile-model
export const createProfileModel = defineModel(
  (initial: Profile | null = null) => {
    const $profile = stateAtom<Profile | null>(initial);

    const $color = ion($profile, (profile) =>
      usernameColor(profile?.username ?? ''),
    );

    const profileChanged = eventAtom<Profile>();

    // An input port: the caller chooses where these values came from.
    const receive = actionAtom((_get, set, profile: Profile) => {
      set($profile, { ...profile, interests: [...profile.interests] });
    });

    const change = actionAtom((get, set, patch: Partial<Profile>) => {
      const current = get($profile);
      if (!current) return;
      const next: Profile = {
        ...current,
        ...patch,
        username: (patch.username ?? current.username).trim(),
        interests: [...(patch.interests ?? current.interests)],
      };
      set($profile, next);
      set(profileChanged, next);
    });

    return { $profile, $color, receive, change, profileChanged };
  },
);

export type ProfileModel = ReturnType<typeof createProfileModel>;
// #endregion profile-model

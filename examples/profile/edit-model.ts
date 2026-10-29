import { actionAtom, eventAtom, stateAtom } from 'jotai-holo/vanilla';

export type ProfileDraft = { name: string; email: string };
export type Profile = ProfileDraft & { id: string };

// #region edit-model
export function createProfileModel() {
  const $draft = stateAtom<ProfileDraft>({ name: '', email: '' });
  const $profile = stateAtom<Profile | null>(null);

  const $name = stateAtom(
    (get) => get($draft).name,
    (get, set, name: string) => set($draft, { ...get($draft), name }),
  );
  const $email = stateAtom(
    (get) => get($draft).email,
    (get, set, email: string) => set($draft, { ...get($draft), email }),
  );

  const $validationError = stateAtom((get) => {
    const draft = get($draft);
    return !draft.name.trim() || !draft.email.includes('@')
      ? 'Enter a name and a valid email.'
      : null;
  });

  const profileSaved = eventAtom<Profile>();

  const acceptSaved = actionAtom((_get, set, profile: Profile) => {
    set($profile, profile);
    set(profileSaved, profile);
  });

  return {
    $draft,
    $name,
    $email,
    $profile,
    $validationError,
    profileSaved,
    acceptSaved,
  };
}
// #endregion edit-model

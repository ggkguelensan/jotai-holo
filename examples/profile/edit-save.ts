import { mutationOptions } from '@tanstack/react-query';
import { actionAtom } from 'jotai-holo/vanilla';
import { createMutationModel } from 'jotai-holo/query';
import { createProfileModel } from './edit-model.js';
import { profileApi } from './edit-api.js';

// #region edit-mutation
export const profileSaveMO = () =>
  mutationOptions({
    mutationKey: ['profile', 'edit'],
    mutationFn: profileApi.save,
  });

export const $$profileMutation = createMutationModel({
  mutation: profileSaveMO,
  prism: {
    $saving: (result) => result.isPending,
    $error: (result) => result.error,
  },
});
// #endregion edit-mutation

// #region edit-save
export const $$profile = createProfileModel();

export const save = actionAtom(async (get, set) => {
  if (get($$profileMutation.$saving)) return;
  if (get($$profile.$validationError)) return;

  const submitted = { ...get($$profile.$draft) };
  try {
    const profile = await set($$profileMutation.mutate, submitted);
    set($$profile.acceptSaved, profile);
  } catch {
    // Query owns the error; the View reads its $error projection.
  }
});
// #endregion edit-save

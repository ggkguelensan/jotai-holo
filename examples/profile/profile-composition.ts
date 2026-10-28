import { mutationOptions, queryOptions } from '@tanstack/react-query';
import { actionAtom, bond, eventAtom } from 'jotai-holo/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import { createMutationModel, createQueryModel } from 'jotai-holo/query';
import { createProfileModel, type Profile } from './profile-model.js';
import { modelProfileSource } from './profile-source.js';

export type ProfileApi = {
  get: (signal: AbortSignal) => Promise<Profile>;
  save: (profile: Profile) => Promise<Profile>;
};

// #region profile-composition
// Application assembly. The business factory does not import this module.
export function createProfileEditor(api: ProfileApi) {
  const profileDetailQO = () =>
    queryOptions({
      queryKey: ['profile', 'current'],
      queryFn: ({ signal }) => api.get(signal),
      staleTime: 60_000,
    });
  const profileSaveMO = () =>
    mutationOptions({
      mutationKey: ['profile', 'current', 'save'],
      mutationFn: api.save,
      onSuccess: (values, _input, _optimistic, { client }) => {
        client.setQueryData(profileDetailQO().queryKey, values);
      },
    });

  const $$profileQuery = createQueryModel({
    query: profileDetailQO,
    prism: {
      $profile: (result) =>
        result.isSuccess && !result.isPlaceholderData ? result.data : undefined,
      $error: (result) => result.error,
    },
  });

  const $$profileMutation = createMutationModel({
    mutation: profileSaveMO,
    prism: {
      $pending: (result) => result.isPending,
      $error: (result) => result.error,
    },
  });

  const profileSaved = eventAtom<Profile>();

  const save = actionAtom(async (get, set, values: Profile) => {
    if (get($$profileMutation.$pending)) return;
    const submitted = { ...values, interests: [...values.interests] };
    const saved = await set($$profileMutation.mutate, submitted);
    set(profileSaved, saved);
    return saved;
  });

  const $$profile = pipe(createProfileModel, modelRegistry());

  // Decorate the existing definition: both select the same business record.
  const $$editor = pipe(
    $$profile,
    modelProfileSource($$profileQuery),
    modelConnection((profile, { store }) =>
      bond({ trigger: profileSaved, write: profile.receive }).connect(store),
    ),
  );

  return {
    $$profile,
    $$editor,
    $$profileQuery,
    $$profileMutation,
    save,
    profileSaved,
  };
}
// #endregion profile-composition

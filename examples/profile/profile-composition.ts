import { mutationOptions, queryOptions } from '@tanstack/react-query';
import { observe } from 'jotai-effect';
import { actionAtom, bond, eventAtom, stateAtom } from 'jotai-holo/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import { createMutationModel, createQueryModel } from 'jotai-holo/query';
import { createProfileModel, type Profile } from './profile-model.js';
import { profileApi } from './profile-api.js';

// #region profile-options
const profileDetailQO = () =>
  queryOptions({
    queryKey: ['profile', 'current'],
    queryFn: ({ signal }) => profileApi.get(signal),
    staleTime: 60_000,
  });
const profileSaveMO = () =>
  mutationOptions({
    mutationKey: ['profile', 'current', 'save'],
    mutationFn: profileApi.save,
    onSuccess: (values, _input, _optimistic, { client }) => {
      client.setQueryData(profileDetailQO().queryKey, values);
    },
  });

// #endregion profile-options

// #region profile-query
export const $$profileQuery = createQueryModel({
  query: profileDetailQO,
  prism: {
    $profile: (result) =>
      result.isSuccess && !result.isPlaceholderData ? result.data : undefined,
    $error: (result) => result.error,
  },
});

export const $$profileMutation = createMutationModel({
  mutation: profileSaveMO,
  prism: {
    $pending: (result) => result.isPending,
    $error: (result) => result.error,
  },
});

// #endregion profile-query

// #region profile-save
export const profileSaved = eventAtom<Profile>();

export const save = actionAtom(async (get, set, values: Profile) => {
  if (get($$profileMutation.$pending)) return;
  const submitted = { ...values, interests: [...values.interests] };
  const saved = await set($$profileMutation.mutate, submitted);
  set(profileSaved, saved);
  return saved;
});

// #endregion profile-save

// #region profile-binding
export const $$profile = pipe(createProfileModel, modelRegistry());

export const $$editor = pipe(
  $$profile,
  modelConnection((profile, { store }) => {
    const $initial = stateAtom((get) =>
      get(profile.$profile) ? undefined : get($$profileQuery.$profile),
    );

    return observe((get, set) => {
      const values = get($initial);
      if (values) set(profile.receive, values);
    }, store);
  }),
  modelConnection((profile, { store }) =>
    bond({ trigger: profileSaved, write: profile.receive }).connect(store),
  ),
);

// #endregion profile-binding

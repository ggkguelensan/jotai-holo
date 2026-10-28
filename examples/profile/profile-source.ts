import type { Atom } from 'jotai/vanilla';
import { modelConnection, type ModelSource } from 'jotai-holo/model';
import type { Profile, ProfileModel } from './profile-model.js';

export type ProfileSource = {
  $profile: Atom<Profile | undefined>;
};

// #region profile-source
// Application-specific binding, not a built-in library operator.
export function modelProfileSource(source: ProfileSource) {
  return <Model extends ProfileModel, Initial>(
    factory: ModelSource<Model, Initial>,
  ) =>
    modelConnection<Model, Initial>((profile, { store }) => {
      // An existing profile wins; do not even subscribe to the Query model.
      if (store.get(profile.$profile)) return;

      let active = true;
      let stop = () => {};
      const release = () => {
        active = false;
        stop();
      };
      const accept = () => {
        if (!active) return;
        // Another source may have initialized the model while loading.
        if (store.get(profile.$profile)) {
          release();
          return;
        }
        const values = store.get(source.$profile);
        if (values === undefined) return;
        store.set(profile.receive, values);
        release();
      };

      try {
        stop = store.sub(source.$profile, accept);
        if (active) accept();
        else stop();
      } catch (error) {
        release();
        throw error;
      }
      return release;
    })(factory);
}
// #endregion profile-source

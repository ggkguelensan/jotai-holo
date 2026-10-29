import { useLingui } from '@lingui/react/macro';
import { actionAtom, holo, prism, stateAtom } from 'jotai-holo';
import { DisplayNameView, ProfileVisibilityView } from './prism-views.js';

// #region prism
export type ProfileVisibility = 'public' | 'friends' | 'private';

const $profile = stateAtom({
  displayName: 'Nova',
  visibility: 'friends' as ProfileVisibility,
});

const { $displayName, $visibility } = prism($profile, {
  $displayName: (profile) => profile.displayName,
  $visibility: (profile) => profile.visibility,
});

const rename = actionAtom((_get, set, displayName: string) =>
  set($profile, (profile) => ({ ...profile, displayName })),
);
const changeVisibility = actionAtom(
  (_get, set, visibility: ProfileVisibility) =>
    set($profile, (profile) => ({ ...profile, visibility })),
);

const DisplayName = holo({
  view: DisplayNameView,
  read: { displayName: $displayName },
  write: { onDisplayName: rename },
});

const ProfileVisibility = holo({
  view: ProfileVisibilityView,
  read: { visibility: $visibility },
  write: { onVisibility: changeVisibility },
});

function ProfileProjections() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Player profile`}</span>
      <DisplayName />
      <ProfileVisibility />
      <p className="demo-note">
        {t`Changing profile visibility does not change the display name.`}
      </p>
    </div>
  );
}
// #endregion prism

export default ProfileProjections;

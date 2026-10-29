import { useLingui } from '@lingui/react/macro';
import { actionAtom, holo, prism, stateAtom } from 'jotai-holo';

// #region prism
type ProfileVisibility = 'public' | 'friends' | 'private';

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

function DisplayNameView({
  displayName,
  onDisplayName,
}: {
  displayName: string;
  onDisplayName: (name: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Display name`}
      <input
        value={displayName}
        onChange={(event) => onDisplayName(event.target.value)}
      />
    </label>
  );
}

const DisplayName = holo({
  view: DisplayNameView,
  read: { displayName: $displayName },
  write: { onDisplayName: rename },
});

function ProfileVisibilityView({
  visibility,
  onVisibility,
}: {
  visibility: ProfileVisibility;
  onVisibility: (visibility: ProfileVisibility) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Profile visibility`}
      <select
        value={visibility}
        onChange={(event) =>
          onVisibility(event.target.value as ProfileVisibility)
        }
      >
        <option value="public">{t`Public`}</option>
        <option value="friends">{t`Friends only`}</option>
        <option value="private">{t`Private`}</option>
      </select>
    </label>
  );
}

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

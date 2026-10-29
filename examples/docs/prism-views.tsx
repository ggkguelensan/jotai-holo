import type { ProfileVisibility } from './prism.js';
import { useLingui } from '@lingui/react/macro';

export function DisplayNameView({
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

export function ProfileVisibilityView({
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

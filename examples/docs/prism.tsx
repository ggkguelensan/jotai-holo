import { useLingui } from '@lingui/react/macro';
import { actionAtom, holo, prism, stateAtom } from 'jotai-holo';

// #region prism
const $user = stateAtom({ name: 'Ada Lovelace', role: 'Editor' });

const { $name, $role } = prism($user, {
  $name: (user) => user.name,
  $role: (user) => user.role,
});

const rename = actionAtom((_get, set, name: string) =>
  set($user, (user) => ({ ...user, name })),
);
const changeRole = actionAtom((_get, set, role: string) =>
  set($user, (user) => ({ ...user, role })),
);

function NameView({
  name,
  onName,
}: {
  name: string;
  onName: (name: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Name projection`}
      <input value={name} onChange={(e) => onName(e.target.value)} />
    </label>
  );
}

const Name = holo({
  view: NameView,
  read: { name: $name },
  write: { onName: rename },
});

function RoleView({
  role,
  onRole,
}: {
  role: string;
  onRole: (role: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Role projection`}
      <select value={role} onChange={(e) => onRole(e.target.value)}>
        <option value="Editor">{t`Editor`}</option>
        <option value="Viewer">{t`Viewer`}</option>
        <option value="Admin">{t`Admin`}</option>
      </select>
    </label>
  );
}

const Role = holo({
  view: RoleView,
  read: { role: $role },
  write: { onRole: changeRole },
});

function ProfileProjections() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">
        {t`One source → two independent atoms`}
      </span>
      <Name />
      <Role />
      <p className="demo-note">
        {t`Changing the role keeps the selected name unchanged.`}
      </p>
    </div>
  );
}
// #endregion prism

export default ProfileProjections;

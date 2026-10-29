import { holo, stateAtom } from 'jotai-holo';

// #region quickstart-view
export function NameView({
  name,
  onChange,
}: {
  name: string;
  onChange: (name: string) => void;
}) {
  return (
    <label>
      Display name
      <input value={name} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
// #endregion quickstart-view

// #region quickstart-state
export const $name = stateAtom('Ada');
// #endregion quickstart-state

// #region quickstart-binding
export const NameField = holo({
  view: NameView,
  read: { name: $name },
  write: { onChange: $name },
});
// #endregion quickstart-binding

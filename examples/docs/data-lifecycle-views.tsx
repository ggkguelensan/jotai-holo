import { useLingui } from '@lingui/react/macro';

export function DraftView({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Name`}
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
      />
    </label>
  );
}

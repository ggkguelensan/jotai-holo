// #region field-contracts
export type NameViewProps = {
  name: string;
  onChange: (name: string) => void;
};

export type EmailViewProps = {
  email: string;
  onChange: (email: string) => void;
};
// #endregion field-contracts

// #region feedback-contracts
export type ErrorViewProps = { error: Error | null };
export type SaveButtonViewProps = { saving: boolean };
// #endregion feedback-contracts

export function NameView({ name, onChange }: NameViewProps) {
  return (
    <label>
      Name
      <input
        required
        pattern={'.*\\S.*'}
        title="Enter a non-blank name"
        value={name}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function EmailView({ email, onChange }: EmailViewProps) {
  return (
    <label>
      Email
      <input
        required
        type="email"
        value={email}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ErrorView({ error }: ErrorViewProps) {
  return error && <p role="alert">{error.message}</p>;
}

export function SaveButtonView({ saving }: SaveButtonViewProps) {
  return (
    <button disabled={saving} type="submit">
      {saving ? 'Saving…' : 'Save profile'}
    </button>
  );
}

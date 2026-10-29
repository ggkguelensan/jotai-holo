import { holo } from 'jotai-holo';
import { $$profile, $$profileMutation, save } from './edit-save.js';

// #region edit-fields
function NameView({
  name,
  onChange,
}: {
  name: string;
  onChange: (name: string) => void;
}) {
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

export const ProfileName = holo({
  view: NameView,
  read: { name: $$profile.$name },
  write: { onChange: $$profile.$name },
});

function EmailView({
  email,
  onChange,
}: {
  email: string;
  onChange: (email: string) => void;
}) {
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

export const ProfileEmail = holo({
  view: EmailView,
  read: { email: $$profile.$email },
  write: { onChange: $$profile.$email },
});
// #endregion edit-fields

// #region edit-feedback
function ErrorView({ error }: { error: Error | null }) {
  return error && <p role="alert">{error.message}</p>;
}

export const ProfileSaveError = holo({
  view: ErrorView,
  read: { error: $$profileMutation.$error },
});

function SaveButtonView({ saving }: { saving: boolean }) {
  return (
    <button disabled={saving} type="submit">
      {saving ? 'Saving…' : 'Save profile'}
    </button>
  );
}

export const ProfileSaveButton = holo({
  view: SaveButtonView,
  read: { saving: $$profileMutation.$saving },
});
// #endregion edit-feedback

// #region edit-view
function ProfileFormView({ onSave }: { onSave: () => Promise<void> }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <ProfileName />
      <ProfileEmail />
      <ProfileSaveError />
      <ProfileSaveButton />
    </form>
  );
}

// #region edit-binding
export const ProfileEditor = holo({
  view: ProfileFormView,
  write: { onSave: save },
});
// #endregion edit-binding
// #endregion edit-view

import { holo } from 'jotai-holo';
import type { ProfileDraft } from './edit-model.js';
import { $$profile, $$profileMutation, save } from './edit-save.js';

// #region edit-view
function ProfileView({
  draft,
  saving,
  error,
  onEdit,
  onSave,
}: {
  draft: ProfileDraft;
  saving: boolean;
  error: Error | null;
  onEdit: (draft: ProfileDraft) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <label>
        Name
        <input
          required
          pattern={'.*\\S.*'}
          title="Enter a non-blank name"
          value={draft.name}
          onChange={(event) => onEdit({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          value={draft.email}
          onChange={(event) => onEdit({ ...draft, email: event.target.value })}
        />
      </label>
      {error && <p role="alert">{error.message}</p>}
      <button disabled={saving} type="submit">
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
// #endregion edit-view

// #region edit-binding
export const ProfileEditor = holo({
  view: ProfileView,
  read: {
    draft: $$profile.$draft,
    saving: $$profileMutation.$saving,
    error: $$profileMutation.$error,
  },
  write: { onEdit: $$profile.$draft, onSave: save },
});
// #endregion edit-binding

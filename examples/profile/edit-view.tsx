import { holo } from 'jotai-holo';
import {
  NameView,
  EmailView,
  ErrorView,
  SaveButtonView,
} from './field-views.js';
import { $$profile, $$profileMutation, save } from './edit-save.js';

// #region edit-fields
export const ProfileName = holo({
  view: NameView,
  read: { name: $$profile.$name },
  write: { onChange: $$profile.$name },
});

export const ProfileEmail = holo({
  view: EmailView,
  read: { email: $$profile.$email },
  write: { onChange: $$profile.$email },
});
// #endregion edit-fields

// #region edit-feedback
export const ProfileSaveError = holo({
  view: ErrorView,
  read: { error: $$profileMutation.$error },
});

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

import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createNotifications } from '../documentation.js';
import { $$profile } from './edit-save.js';

// #region notification-binding
function createProfileNotifications() {
  return createNotifications($$profile);
}

const $$notifications = pipe(createProfileNotifications, modelRegistry());

function NotificationView({ message }: { message: string }) {
  return <output aria-live="polite">{message}</output>;
}

export const SaveNotice = holo({
  models: { notifications: $$notifications },
  view: NotificationView,
  read: ({ notifications }) => ({ message: notifications.$message }),
});
// #endregion notification-binding

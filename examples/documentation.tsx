import { atom } from 'jotai';
import {
  actionAtom,
  bond,
  eventAtom,
  holo,
  holoList,
  holoMatch,
  ion,
  prism,
  stateAtom,
  subscribeEvent,
} from 'jotai-holo';
import { createStore } from 'jotai/vanilla';

// #region state
export const $draft = stateAtom({ name: '', email: '' });
export const $valid = stateAtom((get) => {
  const draft = get($draft);
  return draft.name.trim().length > 0 && draft.email.includes('@');
});
// #endregion state

// #region action
export const changeName = actionAtom((_get, set, name: string) => {
  set($draft, (draft) => ({ ...draft, name }));
});
// #endregion action

// #region ion
export const $saving = stateAtom(false);
export const $canSave = ion(
  { valid: $valid, saving: $saving },
  ({ valid, saving }) => valid && !saving,
);
// #endregion ion

// #region prism
export const { $name, $email } = prism($draft, {
  $name: (draft) => draft.name,
  $email: (draft) => draft.email,
});
// #endregion prism

export type Profile = { id: string; name: string; email: string };
export type ProfileApi = { save: (draft: { name: string; email: string }) => Promise<Profile> };

// #region workflow
export function createProfile(api: ProfileApi) {
  const $draft = stateAtom({ name: '', email: '' });
  const $profile = stateAtom<Profile | null>(null);
  const $saving = stateAtom(false);
  const $error = stateAtom<string | null>(null);
  const profileSaved = eventAtom<Profile>();

  const edit = actionAtom((_get, set, draft: { name: string; email: string }) => {
    set($draft, draft);
  });
  const save = actionAtom(async (get, set) => {
    if (get($saving)) return;
    const draft = get($draft);
    if (!draft.name.trim() || !draft.email.includes('@')) {
      set($error, 'Enter a name and a valid email.');
      return;
    }
    set($saving, true);
    set($error, null);
    try {
      const profile = await api.save(draft);
      set($profile, profile);
      set(profileSaved, profile); // A fact, published only after persistence succeeds.
    } catch (error) {
      set($error, error instanceof Error ? error.message : 'Save failed');
    } finally {
      set($saving, false);
    }
  });
  return { $draft, $profile, $saving, $error, edit, save, profileSaved };
}
// #endregion workflow

// #region event
export const profileSaved = eventAtom<Profile>();
// Publish AFTER your API has saved the profile:
export function publishSaved(store: ReturnType<typeof createStore>, profile: Profile) {
  store.set(profileSaved, profile);
}
// #endregion event

// #region subscription
export function connectAudit(
  store: ReturnType<typeof createStore>,
  writeAudit: (profileId: string) => Promise<void>,
  onError: (error: unknown) => void,
) {
  return subscribeEvent(store, profileSaved, (profile) => writeAudit(profile.id), { onError });
}
// Owner calls the returned function when this application/session ends.
// #endregion subscription

// #region bond
export function createNotifications(model: ReturnType<typeof createProfile>) {
  const $enabled = stateAtom(true);
  const $locale = stateAtom<'en' | 'ru'>('en');
  const $message = stateAtom('');
  const show = actionAtom((_get, set, message: string) => set($message, message));
  const notifying = bond({
    state: { locale: $locale },
    trigger: model.profileSaved,
    guard: $enabled,
    map: ({ locale }, profile) => [
      locale === 'ru' ? `Сохранён профиль ${profile.name}` : `Saved ${profile.name}`,
    ],
    yield: show,
  });
  return { $enabled, $locale, $message, notifying };
}
// #endregion bond

// #region holo
export function NameView({
  name,
  onChange,
  title,
}: {
  name: string;
  onChange: (name: string) => void;
  title: string;
}) {
  return (
    <label>
      {title}
      <input value={name} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
export const NameField = holo({
  core: NameView,
  state: { name: $name },
  actions: { onChange: changeName },
  bindProps: { title: 'Display name' },
});
// <NameField /> has no required public props.
// #endregion holo

// #region cage
const $query = atom('');
const inputChanged = actionAtom((_get, set, query: string) => set($query, query));
function SearchView({ query, term }: { query: string; term: string }) {
  return <output aria-label={`Results for ${term}`}>{query}</output>;
}
export const Search = holo({
  core: SearchView,
  state: { query: $query },
  cage: {
    onChange(_get, set, ctx) {
      set(inputChanged, ctx.props.term);
    },
  },
});
// <Search term="jotai" />
// #endregion cage

// #region list
export const $users = stateAtom<readonly Profile[]>([]);
function UserView({ user, locale }: { user: Profile; locale: string }) {
  return <li lang={locale}>{user.name}</li>;
}
function EmptyUsers({ locale }: { locale: string }) {
  return <li lang={locale}>No users yet</li>;
}
export const Users = holoList({
  source: $users,
  core: UserView,
  getKey: (user) => user.id,
  mapItem: (user) => ({ user }),
  empty: EmptyUsers,
});
// <ul><Users locale="en" /></ul>
// #endregion list

// #region match
export const $status = stateAtom<'loading' | 'ready' | 'error'>('loading');
function LoadingView() {
  return <p>Loading users…</p>;
}
function UsersView() {
  return (
    <ul>
      <Users locale="en" />
    </ul>
  );
}
function ErrorView() {
  return <p role="alert">Could not load users.</p>;
}
export const UsersPage = holoMatch({
  source: $status,
  cases: { loading: LoadingView, ready: UsersView, error: ErrorView },
});
// #endregion match

// #region runtime
export function createProfileRuntime(api: ProfileApi, onError: (error: unknown) => void) {
  const store = createStore();
  const model = createProfile(api);
  const notifications = createNotifications(model);
  const stop = notifications.notifying.connect(store, { onError });
  return { store, model, notifications, dispose: stop };
}
// #endregion runtime

// #region profile-view
function ProfileView({
  draft,
  saving,
  error,
  onEdit,
  onSave,
}: {
  draft: { name: string; email: string };
  saving: boolean;
  error: string | null;
  onEdit: (draft: { name: string; email: string }) => void;
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
          value={draft.name}
          onChange={(event) => onEdit({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={draft.email}
          onChange={(event) => onEdit({ ...draft, email: event.target.value })}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={saving} type="submit">
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
export function createProfileEditor(model: ReturnType<typeof createProfile>) {
  // Call this factory during application setup, outside React render.
  return holo({
    core: ProfileView,
    state: { draft: model.$draft, saving: model.$saving, error: model.$error },
    actions: { onEdit: model.edit, onSave: model.save },
  });
}
// #endregion profile-view

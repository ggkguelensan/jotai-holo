import { atom } from 'jotai';
import {
  actionAtom,
  bond,
  eventAtom,
  holo,
  holoList,
  holoMatch,
  prism,
  stateAtom,
} from 'jotai-holo';
import { createStore } from 'jotai/vanilla';
import type { createProfileModel, Profile } from './profile/edit-model.js';

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

// #region prism

export const { $name, $email } = prism($draft, {
  $name: (draft) => draft.name,
  $email: (draft) => draft.email,
});
// #endregion prism

// #region event

export const profileSaved = eventAtom<Profile>();
// Publish AFTER your API has saved the profile:
export function publishSaved(
  store: ReturnType<typeof createStore>,
  profile: Profile,
) {
  store.set(profileSaved, profile);
}
// #endregion event

// #region bond
export function createNotifications(
  model: ReturnType<typeof createProfileModel>,
) {
  const $enabled = stateAtom(true);
  const $locale = stateAtom<'en' | 'ru'>('en');
  const $message = stateAtom('');

  const show = actionAtom((_get, set, message: string) =>
    set($message, message),
  );

  const notifying = bond({
    state: { locale: $locale },
    trigger: model.profileSaved,
    guard: $enabled,
    map: ({ locale }, profile) => [
      locale === 'ru'
        ? `Сохранён профиль ${profile.name}`
        : `Saved ${profile.name}`,
    ],
    write: show,
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
  view: NameView,
  read: { name: $name },
  write: { onChange: changeName },
  static: { title: 'Display name' },
});
// <NameField /> has no required public props.
// #endregion holo

// #region input

const $query = atom('');

const inputChanged = actionAtom((_get, set, query: string) =>
  set($query, query),
);

function SearchView({ query, term }: { query: string; term: string }) {
  return <output aria-label={`Results for ${term}`}>{query}</output>;
}

export const Search = holo({
  view: SearchView,
  read: { query: $query },
  input: { term: inputChanged },
});
// <Search term="jotai" />
// #endregion input

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
  view: UserView,
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

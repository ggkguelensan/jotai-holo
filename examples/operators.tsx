import { modelRegistry, pipe } from 'jotai-holo/model';
import {
  actionAtom,
  holo,
  holoList,
  holoMatch,
  ion,
  prism,
  stateAtom,
} from 'jotai-holo';

type User = { id: number; name: string };

function createUsersModel() {
  const $users = stateAtom<readonly User[]>([]);
  const $nextId = stateAtom(1);

  const addUser = actionAtom((get, set) => {
    const id = get($nextId);
    set($users, (users) => [...users, { id, name: `User ${id}` }]);
    set($nextId, id + 1);
  });

  return { $users, addUser };
}

const $$users = pipe(createUsersModel, modelRegistry());

const $users = stateAtom((get) => get(get($$users()).$users));

const { $count, $empty } = prism($users, {
  $count: (users) => users.length,
  $empty: (users) => users.length === 0,
});

const $status = ion($empty, (empty) => (empty ? 'idle' : 'ready'));

function UserView({ user }: { user: User }) {
  return <li>{user.name}</li>;
}

const Users = holoList({
  source: $users,
  view: UserView,
  getKey: (user) => user.id,
  mapItem: (user) => ({ user }),
});
function EmptyView() {
  return <p>No users yet.</p>;
}

function UsersView() {
  return (
    <ul>
      <Users />
    </ul>
  );
}

const Content = holoMatch({
  source: $status,
  cases: { idle: EmptyView, ready: UsersView },
});

function UserCountView({ count }: { count: number }) {
  return <output>Users: {count}</output>;
}

const UserCount = holo({
  models: { users: $$users },
  view: UserCountView,
  read: { count: $count },
});

function AddUserView({ onAdd }: { onAdd: () => void }) {
  return <button onClick={() => onAdd()}>Add user</button>;
}

const AddUser = holo({
  models: { users: $$users },
  view: AddUserView,
  write: ({ users }) => ({ onAdd: users.addUser }),
});

export function OperatorsExample() {
  return (
    <section>
      <h2>Model operators</h2>
      <UserCount />
      <AddUser />
      <Content />
    </section>
  );
}

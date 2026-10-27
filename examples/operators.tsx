import { createModel } from 'jotai-holo/model';
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
} from 'jotai-holo';

type User = { id: number; name: string };
const UserDirectory = createModel({
  create: () => {
    const $users = stateAtom<readonly User[]>([]);
    const $nextId = stateAtom(1);
    const addRequested = eventAtom();
    const userAdded = actionAtom((_get, set, user: User) => {
      set($users, (users) => [...users, user]);
      set($nextId, user.id + 1);
    });
    const adding = bond({
      state: $nextId,
      trigger: addRequested,
      map: (id) => [{ id, name: `User ${id}` }],
      yield: userAdded,
    });
    return { $users, addRequested, adding };
  },
  connect: (model, store) => model.adding.connect(store),
});

const $users = stateAtom((get) => get(get(UserDirectory()).$users));

const { $count, $empty } = prism($users, {
  $count: (users) => users.length,
  $empty: (users) => users.length === 0,
});
const $status = ion($empty, (empty) => (empty ? 'idle' : 'ready'));
const Users = holoList({
  source: $users,
  core: ({ user }: { user: User }) => <li>{user.name}</li>,
  getKey: (user) => user.id,
  mapItem: (user) => ({ user }),
});
const Content = holoMatch({
  source: $status,
  cases: {
    idle: () => <p>No users yet.</p>,
    ready: () => (
      <ul>
        <Users />
      </ul>
    ),
  },
});
const Controls = holo({
  model: UserDirectory,
  core: ({ count, onAdd }: { count: number; onAdd: () => void }) => (
    <>
      <output>Users: {count}</output>
      <button onClick={() => onAdd()}>Add user</button>
    </>
  ),
  state: { count: $count },
  actions: (model) => ({ onAdd: model.addRequested }),
});

export function OperatorsExample() {
  return (
    <section>
      <h2>Model operators</h2>
      <Controls />
      <Content />
    </section>
  );
}

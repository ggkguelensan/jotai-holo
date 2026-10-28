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
const $$users = pipe(() => {
  const $users = stateAtom<readonly User[]>([]);
  const $nextId = stateAtom(1);

  const addUser = actionAtom((get, set) => {
    const id = get($nextId);
    set($users, (users) => [...users, { id, name: `User ${id}` }]);
    set($nextId, id + 1);
  });

  return { $users, addUser };
}, modelRegistry());

const $users = stateAtom((get) => get(get($$users()).$users));

const { $count, $empty } = prism($users, {
  $count: (users) => users.length,
  $empty: (users) => users.length === 0,
});
const $status = ion($empty, (empty) => (empty ? 'idle' : 'ready'));
const Users = holoList({
  source: $users,
  view: ({ user }: { user: User }) => <li>{user.name}</li>,
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
  models: { model: $$users },
  view: ({ count, onAdd }: { count: number; onAdd: () => void }) => (
    <>
      <output>Users: {count}</output>
      <button onClick={() => onAdd()}>Add user</button>
    </>
  ),
  read: { count: $count },
  write: ({ model }) => ({ onAdd: model.addUser }),
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

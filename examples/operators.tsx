import { useEffect } from 'react';
import { useStore } from 'jotai';
import { actionAtom, bond, holo, holoList, holoMatch, ion, prism, stateAtom } from 'jotai-holo';

type User = { id: number; name: string };
const $users = stateAtom<readonly User[]>([]);
const $nextId = stateAtom(1);
const addRequested = actionAtom();
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
  core: ({ count, onAdd }: { count: number; onAdd: () => void }) => (
    <>
      <output>Users: {count}</output>
      <button onClick={onAdd}>Add user</button>
    </>
  ),
  state: { count: $count },
  actions: { onAdd: addRequested },
});

export function OperatorsExample() {
  const store = useStore();
  // The demo owns this connection while mounted. Applications can instead
  // connect/dispose alongside their store-owned model or request runtime.
  useEffect(() => adding.connect(store), [store]);
  return (
    <section>
      <h2>Model operators</h2>
      <Controls />
      <Content />
    </section>
  );
}

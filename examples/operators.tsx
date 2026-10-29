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

type Friend = { id: number; name: string };

function createFriendsModel() {
  const $friends = stateAtom<readonly Friend[]>([]);
  const $nextId = stateAtom(1);

  const addFriend = actionAtom((get, set) => {
    const id = get($nextId);
    set($friends, (friends) => [...friends, { id, name: `Player ${id}` }]);
    set($nextId, id + 1);
  });

  return { $friends, addFriend };
}

const $$friends = pipe(createFriendsModel, modelRegistry());

const $friends = stateAtom((get) => get(get($$friends()).$friends));

const { $count, $empty } = prism($friends, {
  $count: (friends) => friends.length,
  $empty: (friends) => friends.length === 0,
});

const $status = ion($empty, (empty) => (empty ? 'idle' : 'ready'));

function FriendView({ friend }: { friend: Friend }) {
  return <li>{friend.name}</li>;
}

const Friends = holoList({
  source: $friends,
  view: FriendView,
  getKey: (friend) => friend.id,
  mapItem: (friend) => ({ friend }),
});
function EmptyView() {
  return <p>No friends yet.</p>;
}

function FriendsView() {
  return (
    <ul>
      <Friends />
    </ul>
  );
}

const Content = holoMatch({
  source: $status,
  cases: { idle: EmptyView, ready: FriendsView },
});

function FriendCountView({ count }: { count: number }) {
  return <output>Friends: {count}</output>;
}

const FriendCount = holo({
  models: { friends: $$friends },
  view: FriendCountView,
  read: { count: $count },
});

function AddFriendView({ onAdd }: { onAdd: () => void }) {
  return <button onClick={() => onAdd()}>Add demo friend</button>;
}

const AddFriend = holo({
  models: { friends: $$friends },
  view: AddFriendView,
  write: ({ friends }) => ({ onAdd: friends.addFriend }),
});

export function OperatorsExample() {
  return (
    <section>
      <h2>Friends list</h2>
      <FriendCount />
      <AddFriend />
      <Content />
    </section>
  );
}

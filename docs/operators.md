# Model operators and connected views

`ion`, `prism`, `bond`, `stateAtom`, `actionAtom` and `eventAtom` are also exported from `jotai-holo/vanilla`, whose module graph has no React dependency. `holoList` and `holoMatch` are React adapters exported from the root. They use the current Jotai Provider store.

The [runnable example](../examples/operators.tsx) connects a model in a React effect, renders projected counts, switches empty/ready branches and preserves keyed user rows.

## ion

```ts
const $count = stateAtom(0);
const $type = stateAtom<'eq' | 'double'>('eq');
const $doubled = ion($count, (count) => count * 2);
const $selected = ion({ count: $count, type: $type }, ({ count, type }) =>
  type === 'eq' ? count : count * 2,
);
const $tuple = ion([$count, $type]); // Atom<[number, 'eq' | 'double']>
const $record = ion({ count: $count, type: $type });
```

The source can be one readable atom, a tuple or an object of readable atoms. The optional projector receives that shape. The result is a native read-only atom: Jotai owns dependencies, store isolation and caching. Input changes use Jotai's usual `Object.is` semantics. Object/tuple assembly creates a new value when a dependency changes; project to the selected value when stable identity matters.

Promises are passed to projectors unchanged. No implicit awaiting, cancellation layer or result cloning is added:

```ts
const $name = ion($asyncUser, async (user) => (await user).name);
```

Use native `atom((get, options) => ...)` for abort signals or other read options. Reading the resulting atom in `holo.state` uses ordinary Suspense and ErrorBoundary behavior.

## prism

```ts
const { $name, $age, $isAdult } = prism($user, {
  $name: (user) => user.name,
  $age: (user) => user.age,
  $isAdult: (user) => user.age >= 18,
});
```

Each property is an independent read-only derived atom. An age-only change does not notify a `$name` subscriber if its selected value is unchanged. Projectors receive raw values, including promises, and may return undefined, promises or throw, just like native derived reads. There is no deep equality or writable lens.

Events have one payload and no handler: `eventAtom<User>()`. They can be written through store.set, subscribed through event.subscribe, or bound to UI actions. See [event subscriptions and ownership](api.md#eventatom).

## bond

```ts
const saveRequested = eventAtom<boolean>();
const saving = bond({
  state: { id: $userId, draft: $draft },
  trigger: saveRequested,
  guard: $canSave,
  map: ({ id, draft }, notify) => [{ id, draft, notify }],
  yield: saveUser,
});

const store = createStore();
const stop = saving.connect(store, { onError: reportError });
store.set(saveRequested, true);
// When the model is disposed:
stop();
```

`connect` starts the connection in one store. A model should own its disposer, just as it owns effect cleanup. Rendering or reading the output alone does not activate a connection. Connect to the same store supplied to the application's Provider. For SSR, connect inside a request-owned model and dispose when that model ends; never connect a request model to a shared module-level store.

| Field     | Meaning when present                                                             | When omitted                                                    |
| --------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `state`   | One atom, tuple or object sampled when a queued trigger is processed             | Only trigger arguments are passed onward                        |
| `trigger` | `eventAtom`/`actionAtom`/bond emission, or a native readable atom's value change | State changes are the trigger                                   |
| `guard`   | Synchronous boolean predicate or `Atom<boolean>`                                 | Every trigger passes                                            |
| `map`     | Synchronous transformation returning an argument tuple                           | `[stateValue]` with state; otherwise original trigger arguments |
| `yield`   | Writable atom, or `(get) => writableAtom` resolver                               | Output can feed another bond                                    |

At least **state or trigger** is required. Every other field can be omitted independently. `map` and predicate arguments are `(stateValue, ...triggerArgs)` with state, or `(...triggerArgs)` without it. A state-only connection calls predicates and maps with just the sampled state. A false guard skips map, target resolution, target writes and output updates. An atom guard is checked before reading sampled state, so a rejected event does not start an otherwise unused state read. A predicate needs state as input and is checked after sampling. With an implicit state clock, observing that clock still requires state reads.

Store-specific target resolution supports dependency inversion:

```ts
// $savePort holds a compatible writable atom; each store can supply a different one.
const saving = bond({
  trigger: saveRequested,
  state: $draft,
  map: (draft, notify) => [{ draft, notify }],
  yield: (get) => get($savePort),
});
```

The resolver runs only for accepted triggers and is not subscribed to independently. Use native atoms as ports so app/model creation can inject implementations with `store.set`.

### Defaults and output

```ts
const forwarded = bond({ trigger: saveRequested });
const doubled = bond({ trigger: amountRequested, map: (amount) => [amount * 2] });
const sink = bond({ trigger: doubled, yield: increment });
const stop = sink.connect(store); // Also connects doubled; disposal releases it.

const selected = bond({ state: $count });
const release = selected.connect(store);
store.get(selected); // [currentCount], or undefined if the initial guard rejected it
```

A bond is a **read-only atom of the last emitted argument tuple**, initially `undefined`, with `connect`. Source-only outputs without `yield` seed their initial tuple on connection, without sending a trigger. Connecting a target-bearing bond does not invoke its target immediately. A rejected guard retains the last accepted output. Disconnect retains that output until a later accepted emission; use `ion`/`prism` for live derived state.

Repeated `eventAtom` writes and `actionAtom` calls publish repeatedly even with identical payloads. The observable call fires after the handler's synchronous work succeeds. A throwing handler does not emit. An async handler emits when it returns its promise, before completion; its eventual rejection remains the caller's responsibility. Native write-only atoms whose readable value stays null cannot act as call events. They remain fully supported as `yield` and `holo.actions` targets. Native readable triggers use value-change notifications, including normal Jotai batching; they cannot observe identical writes as separate events.

### Scheduling, ownership and async work

Connections are shared per bond/store and reference counted: two owners cause one delivery, and the last disposer disconnects. Disposers are idempotent. A downstream connection owns one upstream connection. Updates do not cross stores. Every accepted trigger is queued in FIFO order, including feedback emissions; queued deliveries whose owners were disposed are skipped. A runaway synchronous feedback chain stops after 10,000 queued steps and reports an error.

State and guard reads occur when the queued delivery runs, after the trigger action's synchronous writes. Earlier deliveries can change what later deliveries sample. This is a small store-owned connection mechanism; it does not implement Effector's graph priorities or provide transaction-wide snapshots across separate connections. Add explicit payload data or a single coordinating action when that ordering matters.

State promises are sampled as promises. Neither the guard nor map is awaited. Target promises run independently, and their rejections are sent to the connected owners' `onError` handlers. Synchronous read/map/target errors follow the same route. Without an active error handler, errors are logged with `console.error`. A target error does not change the original trigger's return value or stop other connections. An async target rejection can occur after disposal; it is then logged, without retaining an error handler owned by a disposed model. There is no automatic cancellation or rollback: actions may still write after disposal. Use model-owned AbortControllers or request generations when needed.

## holoList

```tsx
const UsersList = holoList({
  source: $users,
  core: UserView, // user, title, onSelect
  getKey: (user) => user.id,
  mapItem: (user) => ({ user }),
  actions: { onSelect: userSelected },
  bindProps: { title: 'User' },
  empty: EmptyUsersView,
});
```

Declare the list once outside render. `source` is a native readable atom of a readonly array or a promise of one. A stable `getKey` is required. Duplicate React keys throw. `mapItem(item, index)` supplies row props and cannot overlap `state`, `actions` or `bindProps`. These sections follow ordinary holo contracts, including optional molecule bindings. `cage` is per row; its inputs include mapped row props and caller props. Each row owns its subscriptions and cleanup.

Remaining required row props are required on the list and forwarded to each row and the optional empty View. An empty array renders that View, or null. Async arrays use native Suspense and rejection boundaries. Reordering stable keys preserves row-local state; deleting a key disposes that row. Changing the key creates a new row. `mapItem` still runs for each item on a list update; unchanged shallow mapped props skip row/core renders. New object/function props, changed indices and shared state updates can cause additional row renders. Prefer immutable items and stable callbacks.

## holoMatch

```tsx
const Page = holoMatch({
  source: ion({ loading: $loading, error: $error }, ({ loading, error }) =>
    loading ? 'loading' : error ? 'error' : 'ready',
  ),
  cases: { loading: LoadingView, ready: UsersList, error: UsersError },
});
```

The source resolves a string/number selector. Closed unions require every case, or a fallback; open strings/numbers require a fallback. Unknown extra cases are rejected by TypeScript. At runtime, a missing case without a fallback throws. Async selectors use native Suspense/ErrorBoundary behavior.

Only the selected branch is mounted and subscribed. Remaining props must satisfy every branch's required props. A different case key resets branch-local state even if the same component is reused in several cases. Different unknown values retain the same fallback instance. The matcher and component Views use default React memoization. Changing between unmatched values keeps the same fallback and does not invoke its View again when props are shallowly equal. Props, internal state and consumed contexts can still update it. Updates inside active connected branches do not rerender unrelated branches.

## Evaluation and rendering

Passing `stateAtom(fetchUser())` starts the request before the helper runs. Use a derived callback such as `stateAtom(() => fetchUser())` when the request should wait for a read. An already-created Promise is already running.

Declaration allocates atom/component descriptors; it does not read sources, run projectors, create molecule models or mount Views. The [vanilla laziness tests](../tests/laziness.test.ts) compare derived helpers with a native atom control; [Chromium tests](../tests/laziness.browser.test.tsx) separately count selector calls, View invocations and resource mounts around controlled updates.

| Utility                     | What starts work                                                          | When values remain equal                                                                         | Disposal                                                                           |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `stateAtom` derived / `ion` | First read; subscribed dependency changes                                 | Output notifications use `Object.is`                                                             | No subscription: recomputation waits for another read                              |
| `prism`                     | Each individual selected atom's first read                                | Subscribed selectors may execute; unchanged outputs do not notify                                | An unsubscribed sibling stops recomputing even while other siblings stay mounted   |
| `eventAtom`                 | Explicit write; subscribe attaches a listener without reading model state | Every write emits, with no retained payload or native state notification                         | Subscription disposer removes that listener                                        |
| `actionAtom`                | Explicit write                                                            | Every call still emits; readable null does not notify                                            | No implicit model subscription                                                     |
| `bond`                      | Explicit `connect`; events or the implicit state clock                    | Events are not deduplicated; project the output with `ion`/`prism` to filter rendered values     | Last disposer disconnects; reading/rendering the output does not reconnect it      |
| `holo`                      | Mounted state bindings                                                    | Shallowly equal View props skip View calls                                                       | State dependencies unsubscribe; action bindings never read or subscribe to targets |
| `holoList`                  | Mounted list source; state only for existing rows                         | A new array still remaps items; unchanged row props skip row/View calls                          | Empty/deleted rows release their state subscriptions                               |
| `holoMatch`                 | Mounted selector and active branch                                        | Equal case selection does not notify; equal fallback props skip View calls across unknown values | Inactive branches have no atom subscriptions                                       |
| `holoMolecule`              | Adapter rendered in an active branch                                      | Stable model identity reuses atom selectors; unchanged selected state skips View calls           | Bunshi owns model lifecycle; hidden branches release their consumers               |

### prism: recomputing a selector is not a View rerender

```ts
const { $name, $profile, $copy } = prism($user, {
  $name: (user) => user.name,
  $profile: (user) => user.profile,
  $copy: (user) => ({ name: user.name }),
});
```

If only `$name` is consumed, the other two selectors never execute. If all are mounted and only user.age changes, their selectors execute because the input object changed. The unchanged name and retained profile reference do not notify their consumers. `$copy` creates a new object and therefore notifies and rerenders a bound View even if its fields are equal. Preserve immutable branch references or select primitives when avoiding that work matters. Prism does not track individual property access or perform deep equality.

Several consumers of the same projection in one store share Jotai's cached computation. Different stores have independent caches. Reading without subscribing computes a value but does not mount dependency resources. After the last subscriber leaves, dependency writes do not execute the projection until its next read.

Async selectors also wait for their first read. A new promise is a new raw value and can suspend even if it eventually resolves to the same primitive. The tests verify that holo skips the unchanged resolved View props and that its passive cage lifecycle remains mounted during ordinary Suspense hiding. Laziness does not cancel async work already started by a read. Use native Jotai abort signals or model-owned cancellation where required.

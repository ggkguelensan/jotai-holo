# Interface

## stateAtom

```ts
const $count = stateAtom(0); // PrimitiveAtom<number>
const $double = stateAtom((get) => get($count) * 2); // Atom<number>
const $answer = stateAtom(async (get) => (await get($remote)) + 1);
```

Primitive state accepts direct and functional writes via `store.set`, `useSetAtom`, `actionAtom` and `holo.actions`. Derived state has no write function and receives **one argument**, `get`, at runtime and in its type. Async reads retain Jotai dependency tracking.

There is no read/write overload and no async-specific state runtime. For `options.signal`, writable derived atoms or function-valued primitives, use `atom` from Jotai and bind the resulting native atom directly. Jotai v3 removed the read option `setSelf`; use `onMount` or `jotai-effect` for that pattern. A function-valued derived result is supported: `stateAtom(() => someFunction)`.

## eventAtom

```ts
const userSaved = eventAtom<{ id: string; name: string }>();
const opened = eventAtom(); // EventAtom<void>

const stop = subscribeEvent(
  store,
  userSaved,
  (user) => {
    console.log(user.id);
  },
  { onError: reportError },
);
store.set(userSaved, { id: '1', name: 'Ada' });
store.set(opened);
stop(); // idempotent; also skips queued delivery to this listener
```

An event has exactly one typed payload, or no payload with the default void type. It accepts no write handler. Payloads are passed by reference, including functions and promises, without cloning or awaiting. Every write emits, even with identical data. Writes return void. For payloadless UI callbacks use `<button onClick={() => onOpen()}>`; passing a callback directly to a DOM handler forwards React's event argument at runtime.

Events retain no last payload and do not replay earlier calls to new listeners. Their native readable value is always null: `store.sub(event, ...)` and `useAtomValue(event)` observe no call notifications. Use `subscribeEvent(store, event, listener)` for external listeners, `bond.trigger` for model connections and `holo.actions` for UI callbacks. An event is also a compatible `bond.yield` target. Both root and vanilla entry points export `eventAtom`, `subscribeEvent` and their `EventAtom`/`EventOptions` types. The event has no subscribe method: it is a thin wrapper over actionAtom, returning a native writable atom with a minimal publication port. Listener management, FIFO delivery and listener error handling are imported only by subscribeEvent and bond. Removing the last listener detaches the publisher in that store.

A subscription is store-specific and starts immediately, without a bond connection. Keep its disposer at the owner's teardown. Delivery uses the same synchronous FIFO queue as bond; nested events are queued behind current deliveries. Unsubscribe prevents future and still-queued invocations, but does not cancel an async listener that already started. Listener return values are ignored. Synchronous errors and async rejections route to that subscription's optional `onError`, or console.error when no handler is active; they do not interrupt other listeners or change the event write result. A rejection arriving after disposal is logged instead of invoking the disposed owner's handler.

For domain facts after async work, emit at the corresponding point in the action:

```ts
const saveUser = actionAtom(async (_get, set, input: UserInput) => {
  const user = await api.saveUser(input);
  set(userSaved, user);
  return user;
});
```

## actionAtom

```ts
const rename = actionAtom((_get, set, name: string) => {
  set($name, name);
  return name.length;
});
const length = store.set(rename, 'Ada'); // number
```

The result is a native `WritableAtom<null, Args, Result>`. The write receives Jotai's `get` and `set`; rest parameters and return types are inferred. No-payload actions accept no arguments. For notifications without a handler, prefer `eventAtom<Payload>()`; the existing no-handler `actionAtom<Args>()` form remains supported. The action's readable value is always `null`; use it in `actions`, rather than `state`.

### Async actions

```ts
const save = actionAtom(async (get, set, id: string) => {
  const response = await saveUser(id, get($draft));
  set($saved, response);
  return response;
});

// The caller owns error handling.
void store.set(save, id).catch(reportError);
```

Async writes keep targeting their original store after `await`, store replacement or React unmount. Concurrent calls complete independently. Cancellation, deduplication and stale-result protection belong to the model. For example, pass an `AbortSignal` argument and/or use a request generation counter before writing a result. Neither `holo` nor `actionAtom` consumes rejected action promises.

## holo

`core` is the configuration key from the holoenzyme metaphor. Its value is an ordinary UI view, named for example `CounterView`: `core: CounterView`.

```tsx
import { atom } from 'jotai';

const $value = atom(0);
const change = atom(null, (_get, set, next: number) => {
  set($value, next);
});

const Connected = holo({
  core: ValueView,
  state: { value: $value },
  actions: { onChange: change },
  bindProps: { title: 'Fixed title' },
});
```

`state` accepts any readable Jotai `Atom`, including primitive, derived and async atoms created with `atom(...)` or Jotai utilities/extensions. `actions` accepts any `WritableAtom`, including primitive state, writable derived and write-only atoms, provided its arguments and result match the view callback. Read-only atoms cannot be action targets.

`stateAtom` and `actionAtom` are optional creation helpers; neither section requires atoms created by them. The section determines whether holo reads an atom or supplies a setter for it.

| Section                | Core receives                                      | Subscription     |
| ---------------------- | -------------------------------------------------- | ---------------- |
| `state`                | Resolved atom value (`Awaited` value for promises) | Yes              |
| `actions`              | `(...args) => store.set(target, ...args)`          | No               |
| `bindProps`            | The supplied ordinary value                        | No               |
| Remaining public props | Value supplied by the caller                       | React props only |

Keys must exist on the core's props. Atom values, callback arguments and results must be assignable to the declared prop type. Each prop can belong to only one section. Duplicate configured keys throw during declaration as well as failing typecheck. Bound values take precedence even if untyped callers try to override them.

Binding configuration is captured at declaration; do not mutate it or call `holo()` in render. Core can be a function, memo/forwardRef/lazy component, class or intrinsic element. Refs reach intrinsic elements, classes and forwardRef cores on React 18/19. Ref as an ordinary function-View prop requires React 19. Generic components should be specialized first. Discriminated union public props are preserved; binding a discriminator with different branch-specific types is rejected. Narrow the core's props before fixing a union branch.

State bindings resolve promises; the core prop must describe the resolved value. Use `bindProps` to pass a promise object itself. A native Jotai utility or extension atom needs no conversion.

### Subscription and memoization

One internal derived atom combines the state bindings; Jotai tracks dependencies. Reads start together; native `unwrap` retains fulfilled results and `Promise.all` propagates any rejection. The aggregate preserves its result identity for each raw input snapshot across Suspense retries. See [aggregation](aggregation.md) for the internal contract. No-state configurations create no store subscriptions. Actions are memoized per store. The binding wrapper and core use default `React.memo` comparison, so unchanged selected values skip the core even if the aggregate object is recomputed.

A bound state update can render the adapter without rendering the core. A parent passing a fresh object/function prop can render both; stabilize that input if necessary. Context consumed by the core, its own hooks, React StrictMode and React scheduling still affect renders. No fixed invocation count is promised for every React mode. The tests assert meaningful committed output and core calls under controlled updates.

## cage

Prefer dispatching model actions from `cage`. Keep state transitions and business rules in `actionAtom`; lifecycle handlers translate React inputs into action arguments. Direct writes to any compatible writable Jotai atom remain supported, including atoms created with `atom(...)`.

```tsx
// Model: state transitions belong here.
const countChanged = actionAtom((_get, set, count: number) => {
  set($count, count);
});
const counterOpened = actionAtom((_get, set, init: number) => {
  set($count, init * 2);
});
const queryChanged = actionAtom((_get, set, query: string) => {
  set($query, query);
});
const counterClosed = actionAtom((_get, set) => {
  set($count, 0);
});

// React binding: pass inputs to the model's actions.
const Counter = holo({
  core: CounterView, // count, onChange, init and reactive props
  state: { count: $count },
  actions: { onChange: countChanged },
  bindProps: { init: 5 },
  cage: {
    onMount(_get, set, ctx) {
      set(counterOpened, ctx.props.init);
    },
    onChange(_get, set, ctx) {
      set(queryChanged, ctx.props.reactive);
    },
    onUnmount(_get, set) {
      set(counterClosed);
    },
  },
});

<Counter reactive="search" />;
```

`ctx.props` combines caller and static props, excluding state/action outputs. Static props win. The object is read-only in TypeScript. It is compared by own enumerable string keys with `Object.is` values; nested mutation does not count as an input change.

Handlers are synchronous and return `undefined`. Async handlers are rejected by TypeScript; a runtime promise return throws a contract error. Start async work through an action and handle its promise explicitly. The lifecycle neither awaits work nor cancels it. Use `jotai-effect` cleanup for resources that need deterministic disposal.

For each committed instance/store:

1. Passive effect runs `onMount` with the committed input props.
2. `onChange` runs once initially, then after a shallow input change.
3. `onUnmount` runs on disposal with the latest committed input props.

State changes alone do not invoke `onChange`. Abandoned renders do not publish their inputs. Store replacement closes the old store and opens the new one. Multiple instances have separate lifecycles but can share state; avoid resetting shared state on one instance's cleanup unless that is intended.

`cage` uses **passive effects**. It does not initialize state before first render, does not run during SSR, and ordinary Suspense hiding does not close it. Initial suspension delays its first mount until commit. Never rely on `onMount` to resolve state that already prevents that initial commit; initialize the model before rendering, hydrate above it, or use a native async read. React development StrictMode replays mount/change/unmount normally. Errors in lifecycle handlers are React effect errors.

`cage` bridges React inputs/lifetime to model actions. It is not an Effector Gate object: there is no exported `status`, `open`, `close` or shared Gate state. If those are needed, define explicit atoms and actions in the model.

## Stores and server rendering

Use `Provider` to isolate state; create a store per SSR request. Hydrate above the connected child with Jotai's `useHydrateAtoms`. SSR emits the core markup, awaits async reads with a streaming renderer and performs no lifecycle writes. Async actions and effects must be attached to the same explicit store used by the Provider.

This package has no framework-specific server integration. `holo` and its lifecycle module preserve `'use client'` in the built ESM. The `jotai-holo/vanilla` entry has no React dependency in its import graph. Client components, SSR-rendered client components and request-owned vanilla models are distinct concerns; a React Server Component cannot execute a connected client component's hooks on its own.

## Model and view operators

See [ion, prism, bond, holoList and holoMatch](operators.md) for signatures, defaults, ownership, scheduling and async contracts. `bindProps` replaces the former holo configuration key `props`; `ctx.props` remains unchanged.

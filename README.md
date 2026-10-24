# jotai-holo

Plain React cores. Declarative Jotai bindings.

```text
            ○                   ○
             ╲                 ╱
              ●───●──●──●────●
             ╱    │      ╲    ╲
    ○──────●      ●       ●    ●──○
            ╲    ╱ ·     · ╲  ╱
              ●─╯   ·   ·   ●
             ╱                ╲
            ●         Re       ●
           ╱ ╲      ·   ·     ╱
          ╱   ╲   ●─╯   ╰─● ╱
   ○────●      ╲  │       │●──○
         ╲      ●─●───●───●
          ╲    ╱           ╲
            ○               ○
             ╲               ╲
              ○               ○
```

`holo` supplies a React **core** with values, callbacks and static props. The core stays an ordinary component that can be rendered directly in tests and stories. State and actions stay native Jotai atoms that work outside React.

The name recalls a **holoenzyme**: the assembled, active whole. The playful molecular mark puts `Re`, for React, at its center. Inspired by [Reflect's motivation](https://reflect.effector.dev/learn/motivation), adapted to Jotai's atom model.

## Status

Initial implementation; **not yet published to npm**. Supported peers: **Jotai 3.0.1+ within v3, React 19, TypeScript 5.9+**. The tested dependency versions are pinned in the lockfile. ESM only. See the [compatibility matrix](docs/compatibility.md) for exercised scenarios and untested environments.

```sh
pnpm install
pnpm check
pnpm examples
```

## A model and its core

```tsx
import { actionAtom, holo, stateAtom } from 'jotai-holo';

function createCounter(initial = 0) {
  const $count = stateAtom(initial);
  const $double = stateAtom((get) => get($count) * 2);
  const increment = actionAtom((_get, set) => {
    set($count, (count) => count + 1);
  });
  return { $count, $double, increment };
}

function CounterCore({
  title,
  count,
  onIncrement,
}: {
  title: string;
  count: number;
  onIncrement: () => void;
}) {
  return (
    <button onClick={onIncrement}>
      {title}: {count}
    </button>
  );
}

const $$counter = createCounter();
const Counter = holo({
  core: CounterCore,
  state: { count: $$counter.$count },
  actions: { onIncrement: $$counter.increment },
  props: { title: 'Counter' },
});

// All three core props are supplied by holo.
<Counter />;
```

The `$state` / `$$model` prefixes and `createXxx` factories are optional naming conventions. Declare `holo` outside render, or use the [Bunshi adapter recipe](docs/integrations.md#bunshi) to bind a model whose identity comes from a scope.

## Three exports

| Export                                        | Purpose                                                           |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `stateAtom(value)`                            | Writable primitive state, including promise values                |
| `stateAtom(get => value)`                     | Read-only derived state; the callback receives only `get`         |
| `actionAtom((get, set, ...args) => result)`   | Write-only native atom; preserves arguments and sync/async result |
| `holo({ core, state, actions, props, cage })` | Declarative React adapter; only `core` is required                |

`stateAtom` has two forms. Function arguments always mean a derived read; use native `atom` for function-valued primitives, writable derived state, or `options.signal`. No alternate state runtime is introduced.

A writable atom can appear in **both** sections under different prop names:

```tsx
const $count = stateAtom(0);
const Counter = holo({
  core: ({ count, onChange }: { count: number; onChange: (value: number) => void }) => (
    <button onClick={() => onChange(count + 1)}>{count}</button>
  ),
  state: { count: $count },
  actions: { onChange: $count },
});
```

`state` reads and resolves values; `actions` supplies store-bound setters. `props` accepts ordinary values, functions and components unchanged. Duplicate keys across sections are rejected. Remaining core props form the public props of the connected component.

## Rendering and async state

Only bound state subscribes to the nearest Jotai store. An action-only binding does not subscribe to its target. Callbacks retain identity until the store changes. The adapter and core are memoized with React's shallow comparison: bind at leaf components for the smallest update area.

Promise-valued state resolves before reaching the core. Put connected async components under `<Suspense>` and an error boundary. State bindings use [`jotai-eager`](https://github.com/jotaijs/jotai-eager) to read dependencies together and reuse fulfilled values; changing a synchronous binding does not manufacture a new pending promise.

An async action returns its original promise to the caller. There is no automatic cancellation, serialization or latest-wins policy. See [async and lifecycle contracts](docs/api.md#async-actions).

## Lifecycle and integrations

`cage` supplies synchronous `onMount`, `onChange` and `onUnmount` handlers with `(get, set, { props })`. Handlers run in passive effects; `onChange` runs initially and on shallow input-prop changes. Use atom effects for reactive dependencies and resource cleanup, and explicit actions for async work.

- [Complete interface and lifecycle contract](docs/api.md)
- [jotai-effect and Bunshi recipes](docs/integrations.md)
- [Compatibility and rendering evidence](docs/compatibility.md)
- [Runnable examples](examples) and [contributing](CONTRIBUTING.md)

For vanilla models without a React import, use `jotai-holo/vanilla`, which exports `stateAtom` and `actionAtom`.

[MIT](LICENSE), matching [Jotai's license](https://github.com/pmndrs/jotai/blob/main/LICENSE).

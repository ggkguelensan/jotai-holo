# jotai-holo

Plain React views. Declarative Jotai bindings.

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

Connect a React component to Jotai without a hook that forwards every value and callback. Declare the connection with `holo`; pass the UI component as `core: CounterView`. The View receives ordinary props, so tests and stories can render it directly.

The name recalls a **holoenzyme**: the assembled, active whole. The playful molecular mark puts `Re`, for React, at its center. Inspired by [Reflect's motivation](https://reflect.effector.dev/learn/motivation), adapted to Jotai's atom model.

## Status

Initial implementation; **not yet published to npm**. Supported peers: **Jotai 3.0.1+ within v3, React 18 or 19, TypeScript 5.9+**. The tested dependency versions are pinned in the lockfile. ESM only. See the [compatibility matrix](docs/compatibility.md) for exercised scenarios and untested environments.

```sh
pnpm install
pnpm check
pnpm examples
```

## A model and its view

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

function CounterView({
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
  core: CounterView,
  state: { count: $$counter.$count },
  actions: { onIncrement: $$counter.increment },
  bindProps: { title: 'Counter' },
});

// All three core props are supplied by holo.
<Counter />;
```

Use `$` for state atoms and `$$` for model instances if these conventions help your project. Declare `holo` outside React render. Share an instance across widgets with [createModel](docs/reference/createModel.md): the same key and store select the same model.

## Public API

| Export                                            | Purpose                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `stateAtom(value)`                                | Writable primitive state, including promise values                |
| `stateAtom(get => value)`                         | Read-only derived state; the callback receives only `get`         |
| `actionAtom((get, set, ...args) => result)`       | Write-only native atom; preserves arguments and sync/async result |
| `eventAtom<Payload>()`                            | Typed notification without a handler or retained state            |
| `holo({ core, state, actions, bindProps, cage })` | Declarative React adapter; only `core` is required                |

`eventAtom<Payload>()` declares a typed notification without a handler or retained state. Dispatch with `store.set(event, payload)`, use it in `bond.trigger`/`holo.actions`, or attach an external listener with `subscribeEvent(store, event, listener)`. Subscriptions return a disposer; see [event contracts](docs/api.md#eventatom).

Numeric/boolean operators `eq`, `and`, `or`, `some`, and `sum` accept native atoms (arrays or records for multiple inputs) and return lazy read-only atoms.

Model operators are available from the root and `jotai-holo/vanilla`: `ion(source, project?)` combines readable atoms, `prism(source, selectors)` splits projections, and `bond({ state, trigger, guard, map, yield })` connects store-owned actions. React also has `holoList` for keyed rows and `holoMatch` for conditional branches. See [operator contracts and examples](docs/operators.md).

Configuration uses `bindProps` for fixed UI values; lifecycle inputs remain `ctx.props`.

`stateAtom` has two forms. Function arguments always mean a derived read; use native `atom` for function-valued primitives, writable derived state, or `options.signal`. No alternate state runtime is introduced.

`holo.state` accepts any readable Jotai atom; `holo.actions` accepts any compatible writable Jotai atom. Atoms from native `atom(...)`, utilities and extensions need no conversion. `stateAtom` and `actionAtom` are optional helpers. Read-only atoms cannot be action targets.

A writable atom can appear in **both** sections under different prop names:

```tsx
import { atom } from 'jotai';

const $count = atom(0);
const Counter = holo({
  core: ({ count, onChange }: { count: number; onChange: (value: number) => void }) => (
    <button onClick={() => onChange(count + 1)}>{count}</button>
  ),
  state: { count: $count },
  actions: { onChange: $count },
});
```

`state` reads and resolves values; `actions` supplies store-bound setters. `bindProps` accepts ordinary values, functions and components unchanged. Duplicate keys across sections are rejected. Remaining core props form the public props of the connected component.

## Optional infrastructure

| Entry              | Exports                                          | Ownership                                                                                |
| ------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `jotai-holo/model` | `createModel`                                    | Default/keyed instances per Jotai store; committed leases; Infinity retention by default |
| `jotai-holo/query` | `queryAtoms`, `mutationAtoms`, `queryClientAtom` | Native Query/MutationObserver, shared QueryClient, independent prism selectors           |
| `jotai-holo/rhf`   | `createFormModel`, `holoForm`, `formAtom`        | One native RHF control per model; ordinary RHF markup and resolvers                      |

Declare `holo({ model: props => CounterModel({ key: [props.id] }), core: CounterView, state: m => ({ count: m.$count }) })` outside React. Omitting a key selects the store's default model. The registry implementation and optional Query/RHF peers stay outside ordinary holo bundles. [Model contracts](docs/reference/createModel.md) describe creation, resource cleanup, cache eviction and explicit removal; [Query](docs/reference/queryAtoms.md) and [forms](docs/reference/holoForm.md) include executable business examples in English, Russian, German and Kazakh.

## Rendering and async state

Only bound state subscribes to the nearest Jotai store. An action-only binding does not subscribe to its target. Callbacks retain identity until the store changes. The adapter and core are memoized with React's shallow comparison: bind at leaf components for the smallest update area.

Promise-valued state resolves before reaching the core. Put connected async components under `<Suspense>` and an error boundary. State bindings use native Jotai `unwrap` and `Promise.all` to start reads together and reuse fulfilled values; changing a synchronous binding does not manufacture a new pending promise. The package has no runtime dependencies beyond its peers. See the [aggregation design](docs/aggregation.md) for snapshot identity and tested edge cases.

An async action returns its original promise to the caller. There is no automatic cancellation, serialization or latest-wins policy. See [async and lifecycle contracts](docs/api.md#async-actions).

## Lifecycle and integrations

`cage` supplies synchronous `onMount`, `onChange` and `onUnmount` handlers with `(get, set, { props })`. Handlers run in passive effects; `onChange` runs initially and on shallow input-prop changes. Prefer dispatching `actionAtom` from these handlers, keeping state transitions and business rules in the model. Direct writes to writable state atoms are supported. Use atom effects for reactive dependencies and resource cleanup, and explicit actions for async work.

- [Complete interface and lifecycle contract](docs/api.md)
- [Effects and model lifetime](docs/integrations.md)
- [Compatibility and rendering evidence](docs/compatibility.md)
- [Production bundle measurements](docs/bundle-size.md)
- [Runnable examples](examples) and [contributing](CONTRIBUTING.md)

For vanilla models without a React import, use `jotai-holo/vanilla`, which exports the state, action, event and model operators without a React dependency.

[MIT](LICENSE), matching [Jotai's license](https://github.com/pmndrs/jotai/blob/main/LICENSE).

## Documentation website

English, Russian, German and Kazakh guides, utility references, API motivation and realistic recipes live in [docs/](docs/index.md). Run `pnpm docs:dev` to read locally or `pnpm docs:build` for a static site. See [hosting instructions](docs/guide/hosting.md).

## Mutations from Jotai

Use [mutationAtoms](docs/reference/mutationAtoms.md) from `jotai-holo/query`
to execute native TanStack mutations through a writable atom and expose
independent status/data/error projections. It shares the application's
`queryClientAtom`, works without React subscribers, and connects directly
to `holo.actions` and `bond.yield`.

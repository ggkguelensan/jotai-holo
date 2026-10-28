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

Connect a React component to Jotai without a hook that forwards every value and callback. Declare the connection with `holo`; pass the UI component as `view: CounterView`. The View receives ordinary props, so tests and stories can render it directly.

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
  view: CounterView,
  read: { count: $$counter.$count },
  write: { onIncrement: $$counter.increment },
  static: { title: 'Counter' },
});

// All three View props are supplied by holo.
<Counter />;
```

Use `$` for state atoms and `$$` for model instances if these conventions help your project. Declare `holo` outside React render. Share an instance across widgets with [modelRegistry](docs/reference/modelRegistry.md): the same definition, key and store select the same model.

## Public API

| Export                                      | Purpose                                                           |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `stateAtom(value)`                          | Writable primitive state, including promise values                |
| `stateAtom(get => value)`                   | Derived state with native read options                            |
| `actionAtom((get, set, ...args) => result)` | Write-only native atom; preserves arguments and sync/async result |
| `eventAtom<Payload>()`                      | Typed notification without a handler or retained state            |
| `holo({ view, read, write, static })`       | Declarative React adapter; only `view` is required                |

`eventAtom<Payload>()` declares a typed notification without a handler or retained state. Dispatch with `store.set(event, payload)`, use it in `bond.trigger`/`holo.write`, or attach an external listener with `subscribeEvent(store, event, listener)`. Subscriptions return a disposer; see [event contracts](docs/reference/eventAtom.md).

Numeric/boolean operators `eq`, `and`, `or`, `some`, and `sum` accept native atoms (arrays or records for multiple inputs) and return lazy read-only atoms.

Model operators are available from the root and `jotai-holo/vanilla`: `ion(source, project?)` combines readable atoms, `prism(source, selectors)` splits projections, and `bond({ state, trigger, guard, map, write })` connects store-owned actions. React also has `holoList` for keyed rows and `holoMatch` for conditional branches. See [operator contracts and examples](docs/operators.md).

Use `static` for fixed UI values and `input` to forward committed props to writable atoms. Named models own connections. Compose pure factories with `pipe`, `modelRegistry`, `modelLifecycle` and optional `modelAnalytics`. See the [runtime guide](docs/runtime.md).

`stateAtom` is a direct alias of native `atom`, preserving writable derivations and async read options. No alternate state runtime is introduced.

`holo.read` accepts any readable Jotai atom; `holo.write` accepts any compatible writable Jotai atom. Atoms from native `atom(...)`, utilities and extensions need no conversion. `stateAtom` and `actionAtom` are optional helpers. Read-only atoms cannot be action targets.

A writable atom can appear in **both** sections under different prop names:

```tsx
import { atom } from 'jotai';

const $count = atom(0);
const Counter = holo({
  view: ({ count, onChange }: { count: number; onChange: (value: number) => void }) => (
    <button onClick={() => onChange(count + 1)}>{count}</button>
  ),
  read: { count: $count },
  write: { onChange: $count },
});
```

`read` reads and resolves values; `write` supplies store-bound setters. `static` accepts ordinary values, functions and components unchanged. Duplicate keys across sections are rejected. Remaining View props form the public props of the connected component.

## Optional infrastructure

| Entry              | Exports                                                                     | Ownership                                                                                |
| ------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `jotai-holo/model` | `defineModel`, `pipe`, `modelRegistry`, `modelLifecycle`, `modelConnection` | Default/keyed instances per Jotai store; committed leases; Infinity retention by default |
| `jotai-holo/query` | `createQueryModel`, `createMutationModel`, `queryClientAtom`                | Native Query/MutationObserver, shared QueryClient, independent prism selectors           |
| `jotai-holo/rhf`   | `createFormModel`, `holoForm`, `formAtom`                                   | One native RHF control per model; ordinary RHF markup and resolvers                      |

Optional analytics uses `jotai-holo/analytics` (`createAnalytics`, `modelAnalytics`). Vendor adapters have separate entries; `jotai-holo/analytics/amplitude` imports no SDK. `createFormModel` returns a pure factory; apply `modelRegistry()` explicitly.

Declare `holo` outside React. Use named `models` for default or keyed instances; read/write factories receive those names. The registry and optional Query/RHF peers stay outside ordinary holo bundles. See [model contracts](docs/reference/modelRegistry.md), [Query](docs/reference/createQueryModel.md) and [forms](docs/reference/holoForm.md).

## Rendering and async state

Only bound state subscribes to the nearest Jotai store. An action-only binding does not subscribe to its target. Callbacks retain identity until the store changes. The adapter and core are memoized with React's shallow comparison: bind at leaf components for the smallest update area.

Promise-valued reads resolve before reaching View. Put async bindings under Suspense and an error boundary. A fixed chain of native raw atom hooks preserves Jotai continuation, while store-owned weak caches keep stable snapshots. Fulfilled async values stay synchronous beside ordinary updates. See [aggregation](docs/aggregation.md).

An async action returns its original promise to the caller. There is no automatic cancellation, serialization or latest-wins policy. See [async and lifecycle contracts](docs/reference/actionAtom.md).

## Lifecycle and integrations

`input` forwards each selected committed prop independently. StrictMode replay represents one logical owner. Models activate managed bonds, persistence and analytics declarations; the last owner disconnects them. See [input](docs/reference/input.md) and [analytics](docs/reference/createAnalytics.md).

- [Complete interface and lifecycle contract](docs/api.md)
- [Effects and model lifetime](docs/integrations.md)
- [Compatibility and rendering evidence](docs/compatibility.md)
- [Model composition and custom modifiers](docs/guide/model-composition.md)
- [Public API and documentation audit](docs/api-audit.md)
- [Production bundle measurements](docs/bundle-size.md)
- [Runnable examples](examples) and [contributing](CONTRIBUTING.md)

For vanilla models without a React import, use `jotai-holo/vanilla`, which exports the state, action, event and model operators without a React dependency.

[MIT](LICENSE), matching [Jotai's license](https://github.com/pmndrs/jotai/blob/main/LICENSE).

## Documentation website

English, Russian, German and Kazakh guides, utility references, API motivation and realistic recipes live in [docs/](docs/index.md). Run `pnpm docs:dev` to read locally or `pnpm docs:build` for a static site. See [hosting instructions](docs/guide/hosting.md).

## Mutations from Jotai

Use [createMutationModel](docs/reference/createMutationModel.md) from `jotai-holo/query`
to execute native TanStack mutations through a writable atom and expose
independent status/data/error projections. It shares the application's
`queryClientAtom`, works without React subscribers, and connects directly
to `holo.write` and `bond.write`.

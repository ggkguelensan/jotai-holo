# Model integration recipes

The root exports include model operators and React adapters; see the [public API](../README.md#public-api). Bunshi is an optional peer used only by the `jotai-holo/bunshi` adapter entry. The core imports no Bunshi. jotai-effect remains an optional integration.

## jotai-effect

Use [`withAtomEffect`](https://jotai.org/docs/extensions/effect) when an effect should be active while a connected state is subscribed. Bind the **returned atom** in `state`:

```ts
const $count = stateAtom(0);
const $observed = withAtomEffect($count, (get, set) => {
  set($message, `Count: ${get($count)}`);
  return () => {
    /* release external resources */
  };
});

const Counter = holo({ core: CounterView, state: { count: $observed } });
```

Multiple consumers in one store share that mounted effect. The last subscription removal disposes it. An `actions` binding alone never mounts its target. Prefer a pure derived atom when you only need to calculate a value; effects are for synchronization with another resource.

To keep `atomEffect` mounted, read it through a derived state atom that `holo` subscribes to:

```ts
const syncEffect = atomEffect((get, set) => {
  set($remoteState, get($localState));
});
const $display = stateAtom((get) => {
  get(syncEffect);
  return get($localState);
});
```

For application/store-owned effects, use `observe(effect, store)`, retain its disposer and call it at the owner's teardown. Pass that same store to `<Provider store={store}>`; omitting it silently selects a different default store in an explicitly scoped application.

Reactive async work belongs in an effect or action with explicit cancellation/error handling. Capture dependencies synchronously before launching work; reads made only after `await` are not effect dependencies. Return a synchronous cleanup, such as `() => controller.abort()`, rather than returning the promise from the effect or a cage callback.

Runnable example: [effect.tsx](../examples/effect.tsx). Subscription/disposal tests: [integrations.browser.test.tsx](../tests/integrations.browser.test.tsx).

## Bunshi

[Bunshi](https://github.com/saasquatch/bunshi) supplies model identity and lifetime by dependency injection and scopes. Jotai supplies values per store. Keep model construction inside the molecule, and create the `holo` binding once for that returned model.

```tsx
import { holo } from 'jotai-holo';
import { holoMolecule } from 'jotai-holo/bunshi';
import { createScope, molecule, ScopeProvider } from 'bunshi/react';

const CounterScope = createScope('default');
const CounterMolecule = molecule((_mol, scope) => {
  scope(CounterScope);
  return createCounter();
});

const counter = holoMolecule(CounterMolecule);
const Counter = holo({
  core: CounterView,
  state: { count: counter((model) => model.$count) },
  actions: { onIncrement: counter((model) => model.increment) },
  bindProps: { title: 'Counter' },
});

<ScopeProvider scope={CounterScope} value="user-a">
  <Counter />
</ScopeProvider>;
```

`holoMolecule` accepts a molecule or molecule interface and returns an atom-selector adapter. `counter(selector)` returns a binding descriptor, not a Jotai atom: use it in `holo.state` or `holo.actions`, not `store.get`/`store.set`. State selectors must return readable atoms; action selectors must return writable atoms. Direct atoms and adapter bindings can be mixed.

Declare both adapter and holo at module scope. Selectors must be pure; create model atoms inside the molecule. All bindings from the same adapter in one holo share one model resolver. Two separately created adapters remain separate resolvers even if they refer to the same molecule; Bunshi still owns model sharing.

Stable models preserve selected atoms and action callbacks. Public prop changes do not reselect atoms; atom updates do not rerun the model resolver. Replacing the model switches subscriptions and action targets while preserving View identity/local state. `cage` follows the UI instance and input props, so changing a molecule alone does not restart cage. Changing Jotai store still restarts cage under its existing contract. Cage context remains `ctx.props`; models are not injected into it.

The generic binding implementation holds no global model cache. Public Jotai `useAtomValueRaw` hooks read the selected atoms without suspending early. Their native continuable promises are combined in React; no new async derived atom connects a global source to a scoped model. A per-holo weak-key cache preserves snapshot/promise identity across retries without strongly retaining atoms of prior models. React may retry selector evaluation on an uncommitted render; selectors must not acquire resources. Bunshi owns model resources, Jotai owns atom subscriptions, and cage owns UI-instance synchronization.

See [rendering and memory validation](bunshi-validation.md) for the tests and forced-GC experiment.

Equal scope values in one injector share a model; different scope values allocate independent models. A separate Jotai Provider still isolates the values of even the same atom definitions. Bunshi can retain its previous model until the new scope is committed; the adapter follows Bunshi's hook rather than imposing a separate scope-transition policy.

For SSR and isolated tests, provide a request-owned injector:

```tsx
const injector = createInjector();
const store = createStore();
<InjectorProvider value={() => injector}>
  <Provider store={store}>
    <App />
  </Provider>
</InjectorProvider>;
```

Create those owners outside render and dispose any explicit store subscriptions at their owner's teardown. Do not reuse a process-global injector/store across SSR users.

Runnable example: [bunshi.tsx](../examples/bunshi.tsx). Tests cover same-scope sharing, isolation, binding identity, scope replacement cleanup and distinct Jotai stores.

## Bunshi + explicit store + effects

[`bunshi-effect.tsx`](../examples/bunshi-effect.tsx) combines all three:

```text
Bunshi CounterScope
  └─ CounterRuntime molecule
       ├─ atom model + createStore()
       └─ onMount → observe(effect, store) → returned disposer
            └─ Provider(store) → holo + molecule bindings → core
```

The molecule returns both model and store. Its `onMount` registers `observe` and returns the disposer. A small ownership wrapper uses `useMolecule` only to provide that store; the connected View and its atom bindings are declared outside React through the adapter; bound leaves consume the same molecule. This explicit store ownership makes the effect lifetime independent of whether a particular core is temporarily hidden by Suspense.

Use this version when the effect belongs to the model's lifetime. Use `withAtomEffect` when it belongs to subscribed state. Use `cage` when it follows a specific React instance and its input props.

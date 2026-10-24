# Model integration recipes

The root exports stay `stateAtom`, `actionAtom`, `holo`. Effect and Bunshi integrations compose their native interfaces; neither package is a runtime dependency of jotai-holo.

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

const Counter = holo({ core: CounterCore, state: { count: $observed } });
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
const CounterScope = createScope('default');
const CounterMolecule = molecule((_mol, scope) => {
  const id = scope(CounterScope);
  return { ...createCounter(), id };
});

const Counter = holoMolecule(CounterMolecule, (model) =>
  holo({
    core: CounterCore,
    state: { count: model.$count },
    actions: { onIncrement: model.increment },
    props: { title: model.id },
  }),
);

<ScopeProvider scope={CounterScope} value="user-a">
  <Counter />
</ScopeProvider>;
```

[`holoMolecule`](../examples/holo-molecule.tsx) is a **recipe helper**, not a fourth package export. It calls Bunshi's `useMolecule`, then caches the connected component in a WeakMap keyed by model identity. The binder must be pure; do not allocate resources or capture changing caller props there. Remaining public props pass through the adapter. Rebinding creates a different component identity and a normal React remount.

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
            └─ Provider(store) → holoMolecule → holo → core
```

The molecule returns both model and store. Its `onMount` registers `observe` and returns the disposer. A small ownership wrapper provides that store; bound leaves consume the same molecule. This explicit store ownership makes the effect lifetime independent of whether a particular core is temporarily hidden by Suspense.

Use this version when the effect belongs to the model's lifetime. Use `withAtomEffect` when it belongs to subscribed state. Use `cage` when it follows a specific React instance and its input props.

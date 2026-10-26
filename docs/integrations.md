# Model integration recipes

Use jotai-effect to synchronize a model with external resources. Use createModel to share that model between widgets. See the [effects recipe](recipes/integrations.md) for choosing a lifetime.

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

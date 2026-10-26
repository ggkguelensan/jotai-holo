# Effects and model lifetime

Choose what owns a subscription before connecting it. A resource may belong to one displayed value, a shared model or the whole application. That choice determines when cleanup runs.

## Subscription-owned resources

Use `withAtomEffect` when a resource is needed while a View subscribes to an atom. Bind the returned atom in `state`. Consumers in the same store share the effect; the last unsubscribe runs its cleanup. An action-only binding does not activate it.

<<< @/../examples/effect.tsx

## Shared model resources

An editor and its toolbar may need one model even when one widget is hidden. Put the connection in [createModel.connect](/reference/createModel#contract). The first committed owner starts it; the last owner releases it. Select the same key and store in both widgets. Keeping an instance with `gcTime: Infinity` does not keep released subscriptions active.

## Application resources

For a store-wide effect, call `observe(effect, store)` during application setup. Pass that store to the Jotai Provider and call the returned disposer when the application or session ends. Create a separate store for each SSR request.

## Choose the owner

Use `cage` for input props and component lifecycle, `jotai-effect` for reactive synchronization, and model `connect` for resources shared by widgets. For a calculated value, use a derived atom. Async actions need their own cancellation and error policy.

Read [Jotai effect](https://jotai.org/docs/extensions/effect), [createModel](/reference/createModel) and [cage](/reference/cage) for their contracts and examples.

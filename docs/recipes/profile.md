# Profile: command → fact → reaction

A user edits a draft and presses Save. A command validates input and persists it through an API. Only the successful response produces the fact `profileSaved`. A notification module reacts to that fact without controlling persistence.

## Model and async policy

<<< @/../examples/documentation.tsx#workflow

Repeated saves are ignored while one request is pending. The draft is captured before await, so later edits do not change the request. The response updates `$profile`; it does not overwrite the current draft and lose newer edits. Failures enter `$error`, emit no success fact, and clear `$saving` in finally.

This policy belongs to the example, not to actionAtom. Latest-wins, cancellation and retries need a different model policy or a suitable data-fetching tool.

## Independent reaction

<<< @/../examples/documentation.tsx#bond

save performs persistence. profileSaved reports the accepted result, and the notification reacts to it. Disabling notifications does not undo the save.

## Connection ownership

<<< @/../examples/documentation.tsx#runtime

Create the runtime before rendering. Give the Provider `runtime.store`, bind `runtime.model` outside render, and call `runtime.dispose()` when the session ends. For SSR, create a runtime per request. To share keyed models between widgets, use [modelRegistry](/reference/modelRegistry).

API failure is expected model state; the connection's onError handles failures in the reaction itself. This example catches API errors inside save rather than rejecting to the calling View.

## Bind the editor

<<< @/../examples/documentation.tsx#profile-view

Call `const Editor = createProfileEditor(runtime.model)` once during application setup, then render `<Provider store={runtime.store}><Editor /></Provider>`. This factory creates a component definition; it must not run inside another component's render. The View does not import atoms or handle persistence errors itself.

## Verification

The example source is included in TypeScript checking. `tests/documentation.test.ts` checks that no fact occurs before API success, repeated saves make one request, successful facts are delivered, disposal stops reactions, API failure emits no success fact, and invalid input is rejected.

## Reading

[React: separating events from effects](https://react.dev/learn/separating-events-from-effects) helps separate explicit operations from synchronization. [Effector sample](https://effector.dev/en/api/effector/sample/) is the declarative connection analogy. The example demonstrates a command followed by an independent reaction. Durable audit logs and transactional delivery require their own storage and acknowledgement policy.

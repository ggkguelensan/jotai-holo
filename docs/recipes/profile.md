# Profile: command → fact → reaction

A user edits a draft and presses Save. TanStack Query runs the mutation and owns its pending and error state. After success, the command publishes `profileSaved`; a notification reacts without controlling persistence.

## Model and async policy

Keep the draft and validation in the business model. It accepts a saved profile without replacing the current draft, so a response cannot erase edits made while saving:

<<< @/../examples/profile/edit-model.ts#edit-model

Declare the mutation separately, at module scope. Its native options factory uses `profileApi.save`, which calls `PUT /api/profile`. Supply this endpoint in your application; the documentation does not deploy a backend.

<<< @/../examples/profile/edit-save.ts#edit-mutation

The save command coordinates the workflow. It skips invalid drafts and duplicate saves, captures the submitted values and publishes the accepted result only after `mutate` resolves:

<<< @/../examples/profile/edit-save.ts#edit-save

There are no manually maintained request flags. `$saving` and `$error` project native mutation state. The catch handles the rejected Promise; it does not copy the error into another atom. Failed saves publish no success fact. Single-flight is a policy of this command, not a TanStack guarantee.

## Independent reaction

<<< @/../examples/documentation.tsx#bond

`createNotifications($$profile)` connects the fact to a message. It does not import the API or mutation. Disabling notifications prevents the message, not the save.

## Connection ownership

The notification component owns that reaction through its model. Declaring the binding does not subscribe; mounting the component acquires it after commit.

<<< @/../examples/profile/edit-notifications.tsx#notification-binding

Render `SaveNotice` while the editor is active. The last owner leaving stops the reaction. This ephemeral notification does not replay a save that completed while no owner was listening.

Give Jotai [the application's QueryClient](/topics/tanstack-models#queryclientatom). The editor and notice must use the same Jotai store. For SSR, use a separate store and QueryClient per request.

## Bind the editor

The View receives draft values, request state and callbacks. It does not import Query or duplicate its state:

<<< @/../examples/profile/edit-view.tsx#edit-binding

[The complete View source](https://github.com/ggkguelensan/jotai-holo/blob/main/examples/profile/edit-view.tsx) uses native required/email inputs for field feedback. A larger form can keep RHF and its resolver; [the server-data recipe](/recipes/server-data#a-form-initialized-from-server-data) shows that path.

This workflow uses `createMutationModel` because atoms and an independent reaction participate. If only React needs the request, prefer native `useMutation`. To initialize a business profile from a server, follow the [loading and editing workflow](/recipes/profile-composition).

## Verification

The tests check pending state, single-flight, draft isolation, successful facts, failure state and notification cleanup. The browser test exercises the documented editor through pending, success and failure.

## Reading

- [TanStack mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) — request lifecycle, native options and execution Promises.
- [React: separating events from effects](https://react.dev/learn/separating-events-from-effects) — explicit operations and reactive synchronization.
- [Effector sample](https://effector.dev/en/api/effector/sample/) — the declarative connection analogy.

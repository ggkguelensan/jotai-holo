# Server data, forms and saving

These recipes assume the atom/model graph needs server data, form state or save commands. For a React-only editor, prefer native Query and RHF hooks; neither a model registry nor an atom adapter is required. Read [Business logic and small Views](/guide/business-logic) before choosing an adapter.

## Application setup

Use the application's existing QueryClient in both providers. This browser setup creates one client and one Jotai store. Create them per request in an SSR application.

<<< @/../examples/recipes/proposal-setup.tsx#setup

## A model working with server data

A profile model owns the username, avatar, biography and interests. It can derive an avatar color from the username. It does not know whether its input came from a wizard, an existing model, the server or local storage. Query models fetch data, mutation models save it, and application composition connects their results to the business model.

Declare the Query model, mutation model and business model in a module. No application factory is needed. Module declarations describe the graph; each Jotai store holds its own values, and QueryClient holds the server cache. The business factory does not import this assembly module.

<<< @/../examples/profile/profile-composition.ts#profile-query

Connect the participants through pipe. The observe connection reads Query only while the business profile is empty. An existing profile needs no request or Query subscription. The bond connection delivers successful saves to receive while the editor has an owner.

<<< @/../examples/profile/profile-composition.ts#profile-binding

$initial is a derived atom: it reads Query only when the profile is empty. Once receive fills the profile, Jotai removes that dependency and releases the Query subscription. [observe from jotai-effect](https://jotai.org/docs/extensions/effect#observe) forwards the available value; modelConnection stops observation with the last owner. No manual subscription flags or unsubscribe bookkeeping are needed.

Background refetches cannot overwrite a populated profile. Another source that fills it during loading also takes priority. Explicitly clearing the profile allows initialization again; this is conditional initialization, not continuous server synchronization.

## A registry model working with server data

$$profile and $$editor select the same business record for the same key and store. For multiple accounts, partition Query keys, model selections and connections by account; the fixed current-user key here assumes one account context.

The same model key and store share a local draft. Another proposal ID gets another draft. QueryClient still owns the query cache: the registry does not copy or replace it. Include an editor or tab ID in the model key if two editors of the same proposal need independent drafts.

## A form initialized from server data

I need native RHF fields with server defaults and a Zod resolver. Wait for the query result before creating the form instance. This keeps loading and request errors outside the form and lets RHF receive synchronous defaultValues.

<<< @/../examples/recipes/proposal-form.tsx#form-model

<<< @/../examples/recipes/proposal-form.tsx#form-view

<<< @/../examples/recipes/proposal-form.tsx#form-binding

The form key includes editorId: two tabs can share server data and keep independent RHF controls. Background refetches pass a new proposal but do not recreate the existing keyed form or replace its defaults. To explicitly discard edits and reload, use the control's native reset method. Use one holoForm root per control; an external toolbar uses ordinary holo with that same model selection.

## A model saving through a mutation

The save command captures the submitted values and publishes profileSaved only after the mutation succeeds. Failure rejects the Promise and emits no success fact; the caller handles rejection. The UI can read the mutation's error projection.

<<< @/../examples/profile/profile-composition.ts#profile-save

Form keystrokes need not update the canonical profile. Submit a captured draft through the mutation; accept the server response into the business model after success. A later business update or background refetch must not reset the form automatically, especially if the user has made newer edits. Discard, reload and reset-after-save are explicit product decisions. See the [server-data recipes](/recipes/server-data#a-form-initialized-from-server-data) and [RHF contracts](/reference/holoForm).

## A model saving locally

Persist only the editable draft. Keep the storage transport and codec separate from the business factory; the application chooses the storage key and owns the connection. A registry retains in-memory instances, while persist restores snapshots across reloads.

[Use the persist example](/reference/persist#usage) for a plain draft factory and [the composition guide](/topics/model-composition) to give its connection a model owner. Include account and document identity in the storage key.

Validate stored data in the codec. Observe the local draft rather than the Query cache, so a background server update is not treated as a local edit. Local edits take priority over late restoration. Await flush for an explicit save; final release attempts a pending write, but browser shutdown cannot guarantee delivery.

## Reading

- [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — server cache identity.
- [Updating from mutation responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses) — publishing accepted data into the query cache.
- [RHF defaultValues](https://react-hook-form.com/docs/useform#defaultValues) — cached defaults and explicit reset.

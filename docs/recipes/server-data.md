# Server data, forms and saving

Choose the task below. Each route separates server data from the editable values a user may not have saved yet.

If only React needs the data, start with native Query and RHF hooks. Use their atom adapters when another atom or model needs to read the result, execute a save or react to form changes.

## Application setup

Use the same QueryClient in TanStack's provider and the Jotai store. Native hooks and Query models then read the same server cache. Create the client and store per request in an SSR application.

<<< @/../examples/recipes/gift-order-setup.tsx#setup

## A model working with server data

A player profile editor needs an initial profile, but background refetches must not erase its work. Give the business model an input command, then connect a Query projection only while the model is empty.

[Follow the profile workflow](/recipes/profile-composition#use-existing-data-before-loading). It shows how the first accepted value disconnects the Query dependency and how an existing profile avoids loading altogether.

## A registry model working with server data

An editor and its toolbar can share a draft by selecting the same model key in one store. Include a session or tab ID when two editors need independent drafts of the same server entity.

Keep two identities separate:

| Identity  | What it shares                                |
| --------- | --------------------------------------------- |
| Query key | Cached server data through QueryClient        |
| Model key | The local model instance through its registry |

[Read how registry selection works](/topics/models-and-registries). A key does not configure another model's Query options or filter mutation responses. When editing different entities, select the corresponding Query source and route save results to the correct instance. The [profile workflow](/recipes/profile-composition#use-existing-data-before-loading) uses a fixed current-user source; it is not a multi-account binding.

## A form initialized from server data

Wait for the initial data before creating an editable form. RHF receives a snapshot as defaultValues; later refetches do not replace the draft.

The following group-gift form edits the planned copies and gift message. It uses a Zod resolver and includes editorId in its model key. Two tabs can share server data while keeping independent controls.

<<< @/../examples/recipes/gift-order-form.tsx#form-model

<<< @/../examples/recipes/gift-order-form.tsx#form-view

<<< @/../examples/recipes/gift-order-form.tsx#form-binding

The loader mounts the form only after data is available:

<<< @/../examples/recipes/gift-order-form.tsx#form-loading

Use native reset when the user explicitly discards edits or reloads values. Mount one holoForm root per control; an external toolbar uses ordinary holo with the same model selection. See [RHF forms](/topics/rhf-models) for sharing the control.

## A model saving through a mutation

Capture the submitted values, await the mutation, then publish the accepted result. Use a separate form draft to retain newer edits, or define how the model reconciles an older response with changes made during the request. Copying the request values alone does not protect later business-model edits.

[Follow the profile save sequence](/recipes/profile-composition#save-and-accept-the-response). For the mutation's Promise, parallel calls and reset behavior, read [createMutationModel](/reference/createMutationModel).

## A model saving locally

Use persist for a draft that must survive reload. Registry retention alone keeps values only in memory.

[Start with the persist example](/reference/persist#usage). Return its managed declaration from the model so model ownership starts and stops the connection. Include account and document identity in the storage key; the registry key is a separate identity.

Validate stored values in the codec. Local edits take priority over a delayed restore. Await flush for an explicit save: final release attempts a pending write, but browser shutdown cannot guarantee completion.

## Reading

- [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — server cache identity.
- [Updating from mutation responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses) — accepting saved data into the cache.
- [RHF defaultValues](https://react-hook-form.com/docs/useform#defaultValues) — cached defaults and explicit reset.

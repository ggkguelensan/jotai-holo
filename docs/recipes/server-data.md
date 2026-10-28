# Server data, forms and saving

A sales team edits the seat count and customer comment of a proposal. These five recipes use the same request factories and Views. QueryClient owns server data; a model owns the user's draft. The examples expect your application to provide GET and PUT `/api/proposals/:id`; they do not install a demo backend.

These recipes assume the atom/model graph needs server data, form state or save commands. For a React-only editor, prefer native Query and RHF hooks; neither a model registry nor an atom adapter is required. Read [Business logic and small Views](/guide/business-logic) before choosing an adapter.

## Application setup

Use the application's existing QueryClient in both providers. This browser setup creates one client and one Jotai store. Create them per request in an SSR application.

<<< @/../examples/recipes/proposal-setup.tsx#setup

## A model working with server data

I need one proposal editor with a calculated total. A plain factory is enough; no registry or `models` field is required.

<<< @/../examples/recipes/proposal-model.tsx#server-model

Until the first edit, the draft comes from the server response. After editing, `$localDraft` owns the entered values. A background refetch can update server prices, but does not replace the user's seat count or comment. Pending and errors remain separate atoms; the View handles them without an effect.

<<< @/../examples/recipes/proposal-model.tsx#plain-binding

<<< @/../examples/recipes/proposal-views.tsx#view

## A registry model working with server data

I need several widgets to select the same editor by proposal ID. Reuse the same factory and add a registry for the editor instances.

<<< @/../examples/recipes/proposal-registry.tsx#keyed-binding

<<< @/../examples/recipes/proposal-registry.tsx#keyed-usage

The same model key and store share a local draft. Another proposal ID gets another draft. QueryClient still owns the query cache: the registry does not copy or replace it. Include an editor or tab ID in the model key if two editors of the same proposal need independent drafts.

## A form initialized from server data

I need native RHF fields with server defaults and a Zod resolver. Wait for the query result before creating the form instance. This keeps loading and request errors outside the form and lets RHF receive synchronous defaultValues.

<<< @/../examples/recipes/proposal-form.tsx#form-model

<<< @/../examples/recipes/proposal-form.tsx#form-view

<<< @/../examples/recipes/proposal-form.tsx#form-binding

<<< @/../examples/recipes/proposal-form.tsx#form-loading

The form key includes editorId: two tabs can share server data and keep independent RHF controls. Background refetches pass a new proposal but do not recreate the existing keyed form or replace its defaults. To explicitly discard edits and reload, use the control's native reset method. Use one holoForm root per control; an external toolbar uses ordinary holo with that same model selection.

## A model saving through a mutation

I need to save the draft and publish a fact only after the server accepts it. Keep the native mutation-options factory separate from the model.

<<< @/../examples/recipes/proposal-api.ts#mutation-factory

<<< @/../examples/recipes/proposal-mutation.tsx#saving-model

Save captures the submitted draft before await and ignores another Save while pending. The mutation updates QueryClient on success. It does not reset the local draft, so edits made during the request survive. Expected request errors appear through the error projection; this save action catches the rejected Promise and emits no success fact on failure.

For a plain instance, bind its atoms directly:

<<< @/../examples/recipes/proposal-mutation.tsx#plain-saving

For keyed instances, apply a registry to the same factory. Each editor instance owns its mutation observer and pending/error state; all use the same QueryClient.

<<< @/../examples/recipes/proposal-mutation.tsx#keyed-saving

## A model saving locally

I need a draft to survive a page reload without sending it to the server. Persist only the local edits, not a copy of the Query cache. The storage key includes the proposal ID.

<<< @/../examples/recipes/proposal-local.tsx#local-model

Restoration uses the schema to validate stored data. A server response does not count as a local edit and cannot suppress a restored draft. A user's own edits take priority over a late restore. The View disables editing while restoration is pending, displays storage errors and can await disk.flush for an explicit save. Writes are debounced; final release attempts the captured pending write, but browser shutdown is not a delivery guarantee.

A plain model has an application owner: call connectLocalDraft(store) once before mounting LocalProposal, keep the returned disposer and call it when that application session ends. This connection starts storage work; declaring or reading the model alone does not.

<<< @/../examples/recipes/proposal-local.tsx#plain-local-owner

<<< @/../examples/recipes/proposal-local.tsx#plain-local-binding

A registry model returns the persistence declaration as a top-level field. holo acquires it with the model and releases it after the last owner; no manual connect is needed for this variant.

<<< @/../examples/recipes/proposal-local.tsx#keyed-local

Use a storage key that also identifies the account in a multi-account application. Other storage engines, including IndexedDB, can implement the same PersistenceStorage interface. Retention in a registry alone does not survive reloads; local storage alone does not update the server.

## Shared resource factories

The recipe's transport contract validates JSON responses with Zod. Reuse existing Query Kit or native options factories in your application; the adapters do not require Query Kit at runtime.

<<< @/../examples/recipes/proposal-api.ts#contract

<<< @/../examples/recipes/proposal-api.ts#query-factory

See [queryAtoms](/reference/queryAtoms), [mutationAtoms](/reference/mutationAtoms), [holoForm](/reference/holoForm) and [persist](/runtime#rhf-query-and-persistence) for the individual contracts.

## Reading

- [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — server cache identity.
- [Updating from mutation responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses) — publishing accepted data into the query cache.
- [RHF defaultValues](https://react-hook-form.com/docs/useform#defaultValues) — cached defaults and explicit reset.

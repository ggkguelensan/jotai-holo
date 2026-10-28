# Profile: creation and editing

A profile model owns the username, avatar, biography and interests. It can derive an avatar color from the username. It does not know whether its input came from a wizard, an existing model, the server or local storage. Query models fetch data, mutation models save it, and application composition connects their results to the business model.

## The business model

The model accepts values through receive and edits through change. Its profileChanged fact describes a local change; receiving server data does not pretend that the user edited a field. The username color is derived with ion and needs no effect.

<<< @/../examples/profile/profile-model.ts#profile-contract
<<< @/../examples/profile/profile-model.ts#profile-model

The factory imports no Query, RHF or analytics code. Tests can run the same rules in a Jotai store without a View or network request. Add domain rules here when the product needs them; provider field names and transport policies belong elsewhere.

## Independent Query and Mutation models

createQueryModel and createMutationModel create model records directly, conventionally named $$profileQuery and $$profileMutation. They are not factories returned by defineModel. QueryClient owns their server cache; modelRegistry owns shared business-model instances. The example receives an application API adapter; it installs no backend or vendor SDK.

<<< @/../examples/profile/profile-composition.ts#profile-composition

createProfileEditor is application assembly, not a business-model factory. It creates independent participants and connects them. The save action captures the submitted values, awaits the mutation and only then publishes profileSaved. A bond attached through pipe delivers that fact to the owned business model. Failure rejects the Promise and emits no success fact; the caller must handle rejection. The mutation error projection is available for the UI.

## Use existing data before loading

The example edits one current-user profile. The base and decorated definitions select the same business record for the same key and store. An already populated profile is used as-is: the binding does not mount the Query projection. Otherwise it accepts the first usable cached or fetched value through the model's receive port and releases that source subscription. Another source that initializes the profile while loading takes priority.

<<< @/../examples/profile/profile-source.ts#profile-source

modelProfileSource is an application-specific modifier built with modelConnection, not a new library export. It supplies missing initial data once; it does not claim that every observed value is a completed request. It unsubscribes on release and ignores late results. There is no implicit continuous server synchronization. A product that needs fresh data on every visit must define that policy separately. For multiple accounts, partition the Query keys, model selections and bindings by account; the fixed current-user key here assumes one account context.

## Creation wizard

Start a new profile instance with emptyProfile and a key for that creation session. No Query model is needed. Keep one RHF control across the identity, biography, interests and review steps. Step navigation validates the relevant fields using native RHF trigger; moving between steps should not recreate the form or discard values.

The wizard owns an editable form draft. Use RHF directly unless the atom/model graph needs form values or events. When it does, the current createFormModel and holoForm adapters expose the same native control. The proposed modelForm modifier is not implemented yet. A successful creation uses its own create-mutation options factory; the edit example above demonstrates saving the existing current profile.

## Editing form

Resolve the business profile first: use the existing record or let the source binding supply it. Then create the RHF form with a snapshot of those values. The form key identifies the editing session; include a tab ID when two editors must keep independent drafts. Do not create an empty editable form and later overwrite it with a delayed server response.

Form keystrokes need not update the canonical profile. Submit a captured draft through the mutation; accept the server response into the business model after success. A later business update or background refetch must not reset the form automatically, especially if the user has made newer edits. Discard, reload and reset-after-save are explicit product decisions. See the [server-data recipes](/recipes/server-data#a-form-initialized-from-server-data) and [RHF contracts](/reference/holoForm).

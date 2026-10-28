# Profile: creation and editing

A profile model owns the username, avatar, biography and interests. It can derive an avatar color from the username. It does not know whether its input came from a wizard, an existing model, the server or local storage. Query models fetch data, mutation models save it, and application composition connects their results to the business model.

## The business model

The model accepts values through receive and edits through change. Its profileChanged fact describes a local change; receiving server data does not pretend that the user edited a field. The username color is derived with ion and needs no effect.

<<< @/../examples/profile/profile-model.ts#profile-contract
<CodeNotes>

<<< @/../examples/profile/profile-model.ts#profile-model

<CodeNote anchor="const $color">

**Derived color.** ion calculates the color from the profile. A View can subscribe to this result independently of the other fields.

</CodeNote>

<CodeNote anchor="const receive">

**Input port.** Accept data from any source without publishing an edit fact.

</CodeNote>

<CodeNote anchor="const change">

**Edit command.** Apply the patch and business rules, then publish profileChanged with the resulting profile.

</CodeNote>

</CodeNotes>

The factory imports no Query, RHF or analytics code. Tests can run the same rules in a Jotai store without a View or network request. Add domain rules here when the product needs them; provider field names and transport policies belong elsewhere.

## Independent Query and Mutation models

Declare the Query model, mutation model and business model in a module. No application factory is needed. Module declarations describe the graph; each Jotai store holds its own values, and QueryClient holds the server cache. The business factory does not import this assembly module.

Use the application's API client in native TanStack options factories. The example profileApi calls /api/profile; replace it with your endpoints. No backend is deployed with the documentation.

<<< @/../examples/profile/profile-composition.ts#profile-options

createQueryModel and createMutationModel return records directly, conventionally named $$profileQuery and $$profileMutation. They do not need modelRegistry: QueryClient already owns the server cache.

<<< @/../examples/profile/profile-composition.ts#profile-query

The save command captures the submitted values and publishes profileSaved only after the mutation succeeds. Failure rejects the Promise and emits no success fact; the caller handles rejection. The UI can read the mutation's error projection.

<<< @/../examples/profile/profile-composition.ts#profile-save

## Use existing data before loading

Connect the participants through pipe. The observe connection reads Query only while the business profile is empty. An existing profile needs no request or Query subscription. The bond connection delivers successful saves to receive while the editor has an owner.

<<< @/../examples/profile/profile-composition.ts#profile-binding

$initial is a derived atom: it reads Query only when the profile is empty. Once receive fills the profile, Jotai removes that dependency and releases the Query subscription. [observe from jotai-effect](https://jotai.org/docs/extensions/effect#observe) forwards the available value; modelConnection stops observation with the last owner. No manual subscription flags or unsubscribe bookkeeping are needed.

Background refetches cannot overwrite a populated profile. Another source that fills it during loading also takes priority. Explicitly clearing the profile allows initialization again; this is conditional initialization, not continuous server synchronization.

$$profile and $$editor select the same business record for the same key and store. For multiple accounts, partition Query keys, model selections and connections by account; the fixed current-user key here assumes one account context.

## Creation wizard

Start a new profile instance with emptyProfile and a key for that creation session. No Query model is needed. Keep one RHF control across the identity, biography, interests and review steps. Step navigation validates the relevant fields using native RHF trigger; moving between steps should not recreate the form or discard values.

The wizard owns an editable form draft. Use RHF directly unless the atom/model graph needs form values or events. When it does, the current createFormModel and holoForm adapters expose the same native control. The proposed modelForm modifier is not implemented yet. A successful creation uses its own create-mutation options factory; the edit example above demonstrates saving the existing current profile.

## Editing form

Resolve the business profile first: use the existing record or let the source binding supply it. Then create the RHF form with a snapshot of those values. The form key identifies the editing session; include a tab ID when two editors must keep independent drafts. Do not create an empty editable form and later overwrite it with a delayed server response.

Form keystrokes need not update the canonical profile. Submit a captured draft through the mutation; accept the server response into the business model after success. A later business update or background refetch must not reset the form automatically, especially if the user has made newer edits. Discard, reload and reset-after-save are explicit product decisions. See the [server-data recipes](/recipes/server-data#a-form-initialized-from-server-data) and [RHF contracts](/reference/holoForm).

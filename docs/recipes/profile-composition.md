# Profile: creation and editing

A player opens their profile, edits it and saves. The editor should reuse a profile already in memory and load it otherwise. A separate RHF draft can keep unsaved edits while the accepted business profile updates.

This recipe follows that sequence. The business model accepts profile values; a separate assembly module connects loading and saving. The example uses one current-user profile, not a registry of different accounts.

## The business model

Start with the rules that hold regardless of where values come from. `receive` accepts a profile; `change` applies a local patch and publishes `profileChanged`. Receiving server data does not publish an edit fact. `ion` derives the avatar color from the username.

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

The factory creates atoms and commands without fetching data or creating a form. Its rules can run in a Jotai store without React or a network request.

## Independent Query and Mutation models

Next, declare the loading and saving operations in the assembly module. Native TanStack options factories hold the request keys and network policy. The business factory does not import this module.

Here `profileApi` calls `/api/profile`. Supply that endpoint or replace the client before running this recipe; the documentation does not deploy a backend.

<<< @/../examples/profile/profile-composition.ts#profile-options

`createQueryModel` returns named projections of the request result. `createMutationModel` returns a writable `mutate` command and selected execution state. Both return ready-to-use records; neither needs a registry for this workflow. QueryClient shares query data by `queryKey`. A mutation has its own adapter execution state: matching mutation keys do not share that state.

<<< @/../examples/profile/profile-composition.ts#profile-query

## Use existing data before loading

The assembly also publishes `profileSaved` after a successful save. The binding below subscribes to that fact; its declaration and save command appear in [Save and accept the response](#save-and-accept-the-response).

Now connect the source to the business model. `$$profile` defines the shared record. `$$editor` extends that definition and adds two owner-managed connections: initial loading and acceptance of successful saves.

<<< @/../examples/profile/profile-composition.ts#profile-binding

The loading connection has three steps:

1. `$initial` checks whether the business model already has a profile.
2. Only an empty profile makes it read `$$profileQuery.$profile`.
3. [observe](https://jotai.org/docs/extensions/effect#observe) forwards the available value to `receive`.

Once `receive` fills the model, `$initial` stops reading Query. Jotai removes that dependency and releases the Query subscription. An existing profile therefore avoids this Query subscription entirely. `modelConnection` stops the observation when the last owner leaves.

Background refetches cannot overwrite a populated profile. Another source that fills it during loading also takes priority. Explicitly clearing the profile allows initialization again; this is conditional initialization, not continuous server synchronization.

Select `$$editor` in `holo.models` to activate these connections after commit. Other components can select the same key in `$$profile` to use the record without adding another connection. Selecting either definition with that key in the same store reaches the same business instance.

The save connection routes every `profileSaved` to each active editor using this assembly. This is appropriate for one current-user profile. Supporting multiple accounts requires account-specific Query keys and result routing as well as model keys; a registry does not add those rules.

## Save and accept the response

The save command copies the submitted values before awaiting `mutate`. It ignores another save while this mutation is pending. Only a successful response publishes `profileSaved`:

<<< @/../examples/profile/profile-composition.ts#profile-save

The `bond` in `$$editor` forwards that fact to `receive` while an editor owns the connection. The mutation's `onSuccess` callback also updates the Query cache, so native Query consumers see the accepted profile.

Failure rejects the save Promise and publishes no success fact. The caller must handle that rejection; an error projection makes the failure readable but does not catch the Promise.

Accepting the response replaces the business profile. If commands edited that same profile during the request, this example does not merge those edits. Keep a separate form draft, disable business edits while saving, or add a revision/merge policy. A separate RHF draft is not reset by this connection.

## Creation wizard

The same separation can support a creation wizard. The steps below describe how to apply it; this recipe does not include an executable multi-step wizard.

Start a new profile instance with `emptyProfile` and a key for that creation session. No Query model is needed. Keep one RHF control across the identity, biography, interests and review steps. Step navigation validates the relevant fields using native RHF `trigger`; moving between steps should not recreate the form or discard values.

Use native RHF unless other atoms or models need the form values or events. In that case, `createFormModel` and `holoForm` expose the same control. Creating a profile also needs create-specific mutation options; the save operation above updates an existing profile.

## Editing form

Resolve the business profile first: use the existing record or let the source binding supply it. Then create the RHF form with a snapshot of those values. The form key identifies the editing session; include a tab ID when two editors must keep independent drafts. Do not create an empty editable form and later overwrite it with a delayed server response.

Keep the form draft separate from the accepted business profile. Submit a snapshot and await save so RHF can track submission. When the response arrives, retain any edits the user made after submission; a business-profile update must not reset the form automatically.

Choose explicit actions for discard, reload and reset-after-save. The [server-defaults example](/recipes/server-data#a-form-initialized-from-server-data) shows mounting a keyed RHF form after loading. Read [holoForm](/reference/holoForm) for control ownership and [createMutationModel](/reference/createMutationModel#parallel-calls-and-reset) for concurrent saves.

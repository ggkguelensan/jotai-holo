# formAtom

Read one RHF field through a Jotai atom. For example, display the email currently entered in a form inside an external Save panel.

<Demo kind="form">

<<< @/../examples/docs/form.tsx#form

</Demo>

## Usage

```ts
import { formAtom } from 'jotai-holo/rhf';
const $email = formAtom(form, 'email');
const $address = formAtom(form, 'address');
// Write through native form.setValue / reset or your model's actionAtom.
```

## Contract

`formAtom(formControl, fieldPath) → Atom<FieldPathValue>`

- The path is checked against the RHF input type. A nested object/array field is allowed. Create these atoms once inside the form model factory.
- Declaration attaches no listener. Mounted consumers share one subscribe call per atom/store, filtered by field name. The last unmount unsubscribes.
- Reading initially uses getValues. Mount schedules a refresh to close the read/subscribe gap. Changes publish in a coalesced microtask, outside RHF's subscription callback to avoid synchronous re-entry.
- Selected plain objects/arrays are copied with structural sharing because RHF can mutate nested values. Equal selected data reuses the previous snapshot; unrelated field updates do not notify a scalar consumer. Class instances and special values keep their references.
- This is field-value observation, not a complete formState mirror. Use native useFormState for errors, isDirty, isSubmitting, etc.; pass control to an external panel if needed. Use form.getValues for fresh imperative reads when no subscription is mounted.
- A field atom belongs to its control. Reusing the same raw control in two stores intentionally observes that one external form. createFormModel creates separate controls per store.

In an imperative action that needs current input immediately after setValue, read form.getValues. Atom notifications wait for the microtask, so the same call stack can still read the previous atom snapshot.

## Why this API

A field projection is useful for model calculations and outside panels without subscribing every View to all form values. Native useWatch remains the simplest choice within RHF components. Flags remain native rather than inventing a second state engine or accessing RHF private fields.

## Analogies and reading

- [RHF subscribe](https://react-hook-form.com/docs/useform/subscribe) — filtered listeners and callback restrictions.
- [RHF useWatch](https://react-hook-form.com/docs/usewatch) — native component-level value observation.
- [RHF useFormState](https://react-hook-form.com/docs/useformstate) — native state flags and errors.

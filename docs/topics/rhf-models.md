# React Hook Form

Create a separate RHF form for each model key. An editor and an external Save panel can share that form without sharing it with another contact.

[Try isolated contact forms](/examples/contact-forms).

## createFormModel

An RHF control already is the form engine. Creating another Jotai mirror of all form state would introduce timing and validation differences. A model owns the control; native components keep their markup and hooks. Use a plain useForm when a form does not need externally shared model state.

## holoForm

Connect a form model to an RHF View. Keep `register`, `Controller` and `useFormContext` in the View; let other widgets use the same model's atoms and actions.

```tsx
import { holoForm } from 'jotai-holo/rhf';
const ContactEditor = holoForm({
  models: {
    model: (props: { contactId: string }) =>
      $$contact({ key: [props.contactId] }),
  },
  form: ({ model }) => model.form,
  view: ContactView,
});
// ContactView uses ordinary useFormContext, Controller, register,
// and useFieldArray.
<ContactEditor contactId="ada" />;
```

Use holoForm only when the atom/model system needs to react to form values, validation, submission or other form state. A self-contained form should keep native useForm and FormProvider. When a model is needed, the editor keeps its RHF components and an external Save panel can bind to the same model with ordinary holo.

## formAtom

Read one RHF field through a Jotai atom. For example, display the email currently entered in a form inside an external Save panel.

```ts
import { formAtom } from 'jotai-holo/rhf';
const $email = formAtom(form, 'email');
const $address = formAtom(form, 'address');
// Write through native form.setValue / reset or your model's actionAtom.
```

A field projection is useful for model calculations and outside panels without subscribing every View to all form values. Native useWatch remains the simplest choice within RHF components. Flags remain native rather than inventing a second state engine or accessing RHF private fields.

## API reference

- [createFormModel](/reference/createFormModel)
- [holoForm](/reference/holoForm)
- [formAtom](/reference/formAtom)

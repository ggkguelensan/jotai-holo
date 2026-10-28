# holoForm

Connect a form model to an RHF View. Keep `register`, `Controller` and `useFormContext` in the View; let other widgets use the same model's atoms and actions.

Read the [React Hook Form overview](/overview/react-hook-form) for the complete workflow and live examples.

## Usage

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

## Contract

- Accepts the named-model holo configuration plus an explicit form selector: `form: models => models.editor.form`. Bound props disappear from public props; selector inputs remain required.
- The model must come from createFormModel. Native useForm and useFormState bridge its existing formControl to FormProvider so nested markup and useFormContext remain ordinary RHF.
- Exactly one active holoForm root per control. A second root with the same model key throws; choose a different key for another independent form. External toolbars/panels use **ordinary holo** with that key, not another holoForm.
- Existing control options, including resolver, are preserved. Synchronous defaultValues are not reapplied by the bridge on remount. Values remain RHF-owned; shouldUnregister still controls field removal.
- register refs, Controller events, validation, focus, field-array identity, reset, and async submission retain native semantics. Existing UI libraries using Controller/useFormContext need no form-state rewrite. The adapter does not replace their accessibility or DOM contracts.
- Model leases connect after commit, release on cleanup, and tolerate StrictMode replay. Changing the model key remounts the form View. A binding does not add an HTML form element or submission button.

## Why this API

Use holoForm only when the atom/model system needs to react to form values, validation, submission or other form state. A self-contained form should keep native useForm and FormProvider. When a model is needed, the editor keeps its RHF components and an external Save panel can bind to the same model with ordinary holo.

## Analogies and reading

- [RHF FormProvider](https://react-hook-form.com/docs/formprovider) — native context for existing form components.
- [RHF Controller](https://react-hook-form.com/docs/usecontroller/controller) — controlled UI integrations.
- [shadcn forms](https://ui.shadcn.com/docs/forms/react-hook-form) — UI composition with RHF; preserve those native contracts.

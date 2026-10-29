# createFormModel

Create a separate RHF form for each model key. An editor and an external Save panel can share that form without sharing it with another contact.

Use this factory only when atoms or models need to react to form state or operations. A form contained in React can keep native useForm without a model.

## Installation

Import from `jotai-holo/rhf`. Requires React Hook Form 7.91+ within v7. Install your resolver and validator in the application; neither Zod nor resolvers enter the library runtime.

## Contract

`createFormModel({ initial, options, model? }) → ModelFactory`

Apply modelRegistry() to the factory before selecting it in holoForm. Retention belongs to that modifier.

- `options(initial)` returns native UseFormProps. It creates one createFormControl per model instance. `initial` is creation-only, never a reactive reset.
- `model({ form, initial })` optionally returns your atoms and actions. The returned instance includes those fields and `form`. The name form is reserved.
- Input, resolver context, and transformed output types are retained. Native zodResolver, yupResolver, valibotResolver, and other Resolver implementations pass through unchanged; no schema translation is performed. The executable demo uses Zod; the tests also exercise an asynchronous transforming resolver.
- With modelRegistry, control identity is: same definition/key/store shares a control; different keys/stores isolate forms. Default retainTime is Infinity. This retains drafts after unmount; remove them explicitly when no longer needed.
- model.form exposes native register, handleSubmit, setValue, reset, setError, setFocus, subscribe, control, and other createFormControl methods. It does not fabricate useForm's formState object. Use native useFormState for flags and errors.
- Options are fixed at creation. Change values with reset/setValue and explicit model actions. This wrapper does not add reactive values/resolver prop rebinding to holo. Async defaultValues start when a holoForm root mounts, with native RHF loading state. The initial load is shared per model and is not reapplied after successful completion on later remounts. Use reset for an explicit reload.
- The factory creates no subscriptions and runs no React hooks. Custom resources still need explicit ownership. Native RHF state can be shared intentionally across stores only if the application passes the same raw control itself; each registry instance creates its own control.

## Why this API

An RHF control already is the form engine. Creating another Jotai mirror of all form state would introduce timing and validation differences. A model owns the control; native components keep their markup and hooks. Use a plain useForm when a form does not need externally shared model state.

## Analogies and reading

- [RHF createFormControl](https://react-hook-form.com/docs/createFormControl) — native control outside React.
- [RHF resolvers](https://github.com/react-hook-form/resolvers) — validation adapters and transformed output inference.
- [RHF useForm](https://react-hook-form.com/docs/useform) — native options and defaults.

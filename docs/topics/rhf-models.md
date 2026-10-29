# React Hook Form

A contact editor and an external Save panel need the same field values, validation and submission. A second contact needs a separate form. Let a model own one native RHF control, then let both widgets select the same editing instance.

[Try the contact forms](/examples/contact-forms). Enter an email for Ada: her Save panel updates, while Grace's form stays unchanged.

## Create one native form per instance {#createformmodel}

`createFormModel` creates the form and lets you expose selected atoms and commands. The resolver remains the native RHF resolver; there is no second validation engine.

<<< @/../examples/docs/form.tsx#contact-model

Here `$email` projects a field for the external panel. `save` returns `handleSubmit`'s Promise, so RHF can keep submission state until the handler finishes. In a server-backed form, await the mutation inside that handler. A fire-and-forget event cannot represent completion of the save.

## Keep the editor's RHF components {#holoform}

`ContactView` still calls `useFormContext`, `register` and `Controller`. `holoForm` provides the selected control through RHF context:

<<< @/../examples/docs/form.tsx#contact-editor

An external panel uses ordinary `holo` to select the same model by contact ID, read `$email` and invoke `save`:

<<< @/../examples/docs/form.tsx#contact-save-panel

The editor keeps its field markup and third-party RHF components. Another contact ID selects an independent form.

## Project only what the model needs {#formatom}

```ts
import { formAtom } from 'jotai-holo/rhf';

const $email = formAtom(form, 'email');
```

Use `formAtom` when a calculation or another widget needs a field in the atom graph. Inside a field component, native `useWatch` is often enough. Write through `setValue`, `reset` or a model action; the field projection is read-only.

The Save panel can also use native `useFormState` with the shared control. It does not need a Jotai mirror of every RHF flag.

## Initialize an editing session

For server data, decide when it becomes the draft. Opening a new editing session can seed defaults from an existing profile or await the server. Later background refetches should not silently replace what the user typed.

Async defaults start when a `holoForm` root mounts. `defaultValues` initializes a form; use an explicit `reset` policy to replace values in an existing session. The [profile workflow](/recipes/profile-composition#editing-form) explains the separate draft and save boundary.

Use native `useForm` and `FormProvider` for a self-contained form. Add a form model when the atom/model system needs its values or commands, or separate widgets need one editing instance.

## API reference

- [createFormModel](/reference/createFormModel)
- [holoForm](/reference/holoForm)
- [formAtom](/reference/formAtom)

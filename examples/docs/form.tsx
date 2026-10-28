import { modelRegistry, pipe } from 'jotai-holo/model';
import { useLingui } from '@lingui/react/macro';
import { atom } from 'jotai/vanilla';
import { useId } from 'react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { createFormModel, formAtom, holoForm } from 'jotai-holo/rhf';
import {
  Controller,
  useFormContext,
  useFormState,
  type Control,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// #region form
const schema = z.object({
  email: z.email(),
  channel: z.enum(['email', 'phone']),
});
type Values = z.infer<typeof schema>;

const $$contact = pipe(
  createFormModel({
    initial: { email: '', channel: 'email' as const },
    options: (initial) => ({
      defaultValues: initial,
      resolver: zodResolver(schema),
    }),
    model: ({ form }) => {
      const $saved = stateAtom('');
      return {
        $email: formAtom(form, 'email'),
        $control: atom(form.control),
        $saved,
        save: actionAtom((_get, set) =>
          form.handleSubmit((values) => {
            set($saved, values.email);
          })(),
        ),
      };
    },
  }),

  modelRegistry(),
);

function ContactView({ onSave }: { onSave: () => Promise<void> }) {
  const { t } = useLingui();
  const errorId = useId();
  const { register, control } = useFormContext<Values>();
  const { errors } = useFormState({ control });

  return (
    <form
      className="demo-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <label>
        {t`Email`}
        <input
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? errorId : undefined}
          {...register('email')}
        />
      </label>
      {errors.email && (
        <small id={errorId} role="alert">
          {t`Enter a valid email`}
        </small>
      )}
      <Controller
        name="channel"
        control={control}
        render={({ field }) => {
          return (
            <label>
              {t`Contact channel`}
              <select {...field}>
                <option value="email">{t`Email`}</option>
                <option value="phone">{t`Phone`}</option>
              </select>
            </label>
          );
        }}
      />
    </form>
  );
}

const Editor = holoForm({
  form: ({ model }) => model.form,
  models: {
    model: (props: { contactId: string }) =>
      $$contact({ key: [props.contactId] }),
  },
  view: ContactView,
  write: ({ model: m }) => ({ onSave: m.save }),
});

function SaveView({
  email,
  saved,
  control,
  onSave,
}: {
  email: string;
  saved: string;
  control: Control<Values>;
  onSave: () => Promise<void>;
}) {
  const { t } = useLingui();

  const { isSubmitting } = useFormState({ control });

  return (
    <aside className="demo-form demo-save-panel">
      <span className="demo-eyebrow">{t`External save panel`}</span>
      <small>{email || t`No email yet`}</small>
      <button disabled={isSubmitting} onClick={() => void onSave()}>
        {t`Save contact`}
      </button>
      {saved && (
        <output>
          {t`Saved:`} {saved}
        </output>
      )}
    </aside>
  );
}

const SavePanel = holo({
  models: {
    model: (props: { contactId: string }) =>
      $$contact({ key: [props.contactId] }),
  },
  view: SaveView,
  read: ({ model: m }) => ({
    email: m.$email,
    saved: m.$saved,
    control: m.$control,
  }),
  write: ({ model: m }) => ({ onSave: m.save }),
});

function ContactsDemo() {
  const { t } = useLingui();

  return (
    <div className="demo-instances">
      {['Ada', 'Grace'].map((id) => {
        return (
          <section key={id} className="demo-contact-card">
            <header>
              <strong>{id}</strong>
              <span className="demo-eyebrow">{t`Contact preferences`}</span>
            </header>
            <Editor contactId={id} />
            <SavePanel contactId={id} />
          </section>
        );
      })}
    </div>
  );
}
// #endregion form

export default ContactsDemo;

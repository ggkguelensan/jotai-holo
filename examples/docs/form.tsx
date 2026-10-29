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
// #region contact-model
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

// #endregion contact-model

function EmailField() {
  const { t } = useLingui();
  const errorId = useId();
  const { register, control } = useFormContext<Values>();
  const { errors } = useFormState({ control, name: 'email', exact: true });

  return (
    <>
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
    </>
  );
}

function ChannelField() {
  const { t } = useLingui();
  const { control } = useFormContext<Values>();

  return (
    <Controller
      name="channel"
      control={control}
      render={({ field }) => (
        <label>
          {t`Contact channel`}
          <select {...field}>
            <option value="email">{t`Email`}</option>
            <option value="phone">{t`Phone`}</option>
          </select>
        </label>
      )}
    />
  );
}

function ContactView({ onSave }: { onSave: () => Promise<void> }) {
  return (
    <form
      className="demo-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <EmailField />
      <ChannelField />
    </form>
  );
}

// #region contact-editor
const Editor = holoForm({
  form: ({ model: $$contact }) => $$contact.form,
  models: {
    model: (props: { contactId: string }) =>
      $$contact({ key: [props.contactId] }),
  },
  view: ContactView,
  write: ({ model: $$contact }) => ({ onSave: $$contact.save }),
});

// #endregion contact-editor

// #region contact-save-panel
// #region contact-email-preview
function EmailPreviewView({ email }: { email: string }) {
  const { t } = useLingui();

  return <small>{email || t`No email yet`}</small>;
}

const EmailPreview = holo({
  models: {
    model: (props: { contactId: string }) =>
      $$contact({ key: [props.contactId] }),
  },
  view: EmailPreviewView,
  read: ({ model: $$contact }) => ({ email: $$contact.$email }),
});

// #endregion contact-email-preview

function SubmitView({
  control,
  onSave,
}: {
  control: Control<Values>;
  onSave: () => Promise<void>;
}) {
  const { t } = useLingui();

  const { isSubmitting } = useFormState({ control });

  return (
    <button disabled={isSubmitting} onClick={() => void onSave()}>
      {t`Save contact`}
    </button>
  );
}

const Submit = holo({
  models: {
    model: (props: { contactId: string }) =>
      $$contact({ key: [props.contactId] }),
  },
  view: SubmitView,
  read: ({ model: $$contact }) => ({
    control: $$contact.$control,
  }),
  write: ({ model: $$contact }) => ({ onSave: $$contact.save }),
});

function SavedMessageView({ saved }: { saved: string }) {
  const { t } = useLingui();

  return saved ? (
    <output>
      {t`Saved:`} {saved}
    </output>
  ) : null;
}

const SavedMessage = holo({
  models: {
    model: (props: { contactId: string }) =>
      $$contact({ key: [props.contactId] }),
  },
  view: SavedMessageView,
  read: ({ model: $$contact }) => ({ saved: $$contact.$saved }),
});

// #region contact-save-layout
function SavePanel({ contactId }: { contactId: string }) {
  const { t } = useLingui();

  return (
    <aside className="demo-form demo-save-panel">
      <span className="demo-eyebrow">{t`External save panel`}</span>
      <EmailPreview contactId={contactId} />
      <Submit contactId={contactId} />
      <SavedMessage contactId={contactId} />
    </aside>
  );
}

// #endregion contact-save-layout
// #endregion contact-save-panel

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

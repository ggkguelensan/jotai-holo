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
// #region notifications-model
const schema = z.object({
  email: z.email(),
  channel: z.enum(['email', 'in-app']),
});
type Values = z.infer<typeof schema>;

const $$notifications = pipe(
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

// #endregion notifications-model

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
          placeholder="player@example.com"
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
          {t`Notification channel`}
          <select {...field}>
            <option value="email">{t`Email`}</option>
            <option value="in-app">{t`In-app`}</option>
          </select>
        </label>
      )}
    />
  );
}

function NotificationSettingsView({ onSave }: { onSave: () => Promise<void> }) {
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

// #region notifications-editor
const Editor = holoForm({
  form: ({ model: $$notifications }) => $$notifications.form,
  models: {
    model: (props: { playerId: string }) =>
      $$notifications({ key: [props.playerId] }),
  },
  view: NotificationSettingsView,
  write: ({ model: $$notifications }) => ({ onSave: $$notifications.save }),
});

// #endregion notifications-editor

// #region notifications-save-panel
// #region notifications-email-preview
function EmailPreviewView({ email }: { email: string }) {
  const { t } = useLingui();

  return <small>{email || t`No email yet`}</small>;
}

const EmailPreview = holo({
  models: {
    model: (props: { playerId: string }) =>
      $$notifications({ key: [props.playerId] }),
  },
  view: EmailPreviewView,
  read: ({ model: $$notifications }) => ({ email: $$notifications.$email }),
});

// #endregion notifications-email-preview

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
      {t`Save preferences`}
    </button>
  );
}

const Submit = holo({
  models: {
    model: (props: { playerId: string }) =>
      $$notifications({ key: [props.playerId] }),
  },
  view: SubmitView,
  read: ({ model: $$notifications }) => ({
    control: $$notifications.$control,
  }),
  write: ({ model: $$notifications }) => ({ onSave: $$notifications.save }),
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
    model: (props: { playerId: string }) =>
      $$notifications({ key: [props.playerId] }),
  },
  view: SavedMessageView,
  read: ({ model: $$notifications }) => ({ saved: $$notifications.$saved }),
});

// #region notifications-save-layout
function SavePanel({ playerId }: { playerId: string }) {
  const { t } = useLingui();

  return (
    <aside className="demo-form demo-save-panel">
      <span className="demo-eyebrow">{t`External save panel`}</span>
      <EmailPreview playerId={playerId} />
      <Submit playerId={playerId} />
      <SavedMessage playerId={playerId} />
    </aside>
  );
}

// #endregion notifications-save-layout
// #endregion notifications-save-panel

function NotificationSettingsDemo() {
  const { t } = useLingui();

  return (
    <div className="demo-instances">
      {['Nova', 'Pixel'].map((id) => {
        return (
          <section key={id} className="demo-player-card">
            <header>
              <strong>{id}</strong>
              <span className="demo-eyebrow">{t`Player notifications`}</span>
            </header>
            <Editor playerId={id} />
            <SavePanel playerId={id} />
          </section>
        );
      })}
    </div>
  );
}
// #endregion form

export default NotificationSettingsDemo;

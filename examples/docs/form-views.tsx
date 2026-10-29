import { motion } from 'motion/react';
import { useLingui } from '@lingui/react/macro';
import { useFormState, type Control } from 'react-hook-form';
import type { Values } from './form.js';

export function EmailPreviewView({ email }: { email: string }) {
  const { t } = useLingui();

  return <small>{email || t`No email yet`}</small>;
}

export function SubmitView({
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

export function SavedMessageView({ saved }: { saved: string }) {
  const { t } = useLingui();

  return saved ? (
    <motion.output
      key={saved}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {t`Saved:`} {saved}
    </motion.output>
  ) : null;
}

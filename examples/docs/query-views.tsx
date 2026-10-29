import { motion } from 'motion/react';
import { useLingui } from '@lingui/react/macro';
import type { Game } from './query.js';

export function CardView({ data }: { data: Game | null | undefined }) {
  const { t } = useLingui();
  // A separate screen atom does not narrow this atom's TypeScript type.
  if (!data) return null;
  const name = data.id === 'starfall' ? t`Starfall` : t`Moon Harbor`;

  return (
    <motion.p
      key={data.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
    >{`${name} · $${data.price}`}</motion.p>
  );
}

export function LoadingView() {
  const { t } = useLingui();

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
    >{t`Loading…`}</motion.p>
  );
}

export function EmptyView() {
  const { t } = useLingui();

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
    >{t`Game not found.`}</motion.p>
  );
}

export function ErrorView({ error }: { error: Error | null }) {
  const { t } = useLingui();

  return (
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert">
      {error?.message ?? t`Could not load. Try again.`}
    </motion.p>
  );
}

export function SwitchView({
  onChange,
}: {
  onChange: (value: string) => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button onClick={() => onChange('starfall')}>{t`Starfall`}</button>
      <button onClick={() => onChange('moon-harbor')}>{t`Moon Harbor`}</button>
    </div>
  );
}

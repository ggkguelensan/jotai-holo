import { motion } from 'motion/react';
import { useLingui } from '@lingui/react/macro';
import type { Status } from './match.js';

export function LoadingView() {
  const { t } = useLingui();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="demo-branch"
      role="status"
    >
      ◌ {t`Loading your game library…`}
    </motion.div>
  );
}

export function ReadyView() {
  const { t } = useLingui();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="demo-branch"
      role="status"
    >
      ✓ {t`Your game library is ready.`}
    </motion.div>
  );
}

export function ErrorView() {
  const { t } = useLingui();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="demo-branch"
      role="alert"
    >
      ! {t`Could not load. Try again.`}
    </motion.div>
  );
}

export function StatusView({
  status,
  onStatus,
}: {
  status: Status;
  onStatus: (value: Status) => void;
}) {
  const { t } = useLingui();
  const labels = { loading: t`Loading`, ready: t`Ready`, error: t`Error` };

  return (
    <div className="demo-controls">
      {(['loading', 'ready', 'error'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={status === value}
          onClick={() => onStatus(value)}
        >
          {labels[value]}
        </button>
      ))}
    </div>
  );
}

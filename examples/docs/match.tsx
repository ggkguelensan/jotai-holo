import { useLingui } from '@lingui/react/macro';
import { holo, holoMatch, stateAtom } from 'jotai-holo';

// #region match
type Status = 'loading' | 'ready' | 'error';

const $status = stateAtom<Status>('ready');

function LoadingView() {
  const { t } = useLingui();

  return <div className="demo-branch">◌ {t`Loading your workspace…`}</div>;
}

function ReadyView() {
  const { t } = useLingui();

  return <div className="demo-branch">✓ {t`Your workspace is ready.`}</div>;
}

function ErrorView() {
  const { t } = useLingui();

  return (
    <div className="demo-branch" role="alert">
      ! {t`Could not load. Try again.`}
    </div>
  );
}

const Content = holoMatch({
  source: $status,
  cases: { loading: LoadingView, ready: ReadyView, error: ErrorView },
});

function StatusView({
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

const Controls = holo({
  view: StatusView,
  read: { status: $status },
  write: { onStatus: $status },
});

function MatchDemo() {
  return (
    <div className="demo-form">
      <Controls />
      <Content />
    </div>
  );
}
// #endregion match

export default MatchDemo;

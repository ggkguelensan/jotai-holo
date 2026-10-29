import { holo, holoMatch, stateAtom } from 'jotai-holo';
import {
  LoadingView,
  ReadyView,
  ErrorView,
  StatusView,
} from './match-views.js';

// #region match
export type Status = 'loading' | 'ready' | 'error';

const $status = stateAtom<Status>('ready');

const Content = holoMatch({
  source: $status,
  cases: { loading: LoadingView, ready: ReadyView, error: ErrorView },
});

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

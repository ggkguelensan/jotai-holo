import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { actionAtom, holo, holoList, stateAtom } from 'jotai-holo';

// #region list
type Task = { id: number; text: string };
const $tasks = stateAtom<readonly Task[]>([
  { id: 1, text: 'review' },
  { id: 2, text: 'ship' },
]);

const reverse = actionAtom((_get, set) => set($tasks, (items) => [...items].reverse()));
const reset = actionAtom((_get, set) => set($tasks, []));

function TaskView({ task }: { task: Task }) {
  const { t } = useLingui();

  const [done, setDone] = useState(false);

  return (
    <li>
      <label className="demo-checkbox">
        <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
        <span style={{ textDecoration: done ? 'line-through' : 'none' }}>
          {task.text === 'review' ? t`Review proposal` : t`Ship documentation`}
        </span>
        <code>#{task.id}</code>
      </label>
    </li>
  );
}

function TasksEmptyView() {
  const { t } = useLingui();

  return <li className="demo-note">{t`All clear.`}</li>;
}

const Tasks = holoList({
  source: $tasks,
  core: TaskView,
  getKey: (task) => task.id,
  mapItem: (task) => ({ task }),
  empty: TasksEmptyView,
});

function ControlsView({ onReverse, onClear }: { onReverse: () => void; onClear: () => void }) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button type="button" onClick={() => onReverse()}>
        {t`Reverse rows`}
      </button>
      <button type="button" onClick={() => onClear()}>
        {t`Clear`}
      </button>
    </div>
  );
}

const Controls = holo({
  core: ControlsView,
  actions: { onReverse: reverse, onClear: reset },
});

function ListDemo() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Stable keys preserve row state`}</span>
      <ul className="demo-task-list">
        <Tasks />
      </ul>
      <Controls />
      <p className="demo-note">{t`Check a task, then reverse the rows.`}</p>
    </div>
  );
}
// #endregion list

export default ListDemo;

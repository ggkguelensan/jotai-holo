import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import type { StorageStatus } from '../../models/types.js';

export function SheetTabView({
  id,
  title,
  active,
  status,
  onSwitch,
  onRename,
}: {
  id: string;
  title: string;
  active: boolean;
  status: StorageStatus | undefined;
  onSwitch: (id: string) => void;
  onRename: (value: { id: string; title: string }) => void;
}) {
  const { t } = useLingui();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  return (
    <div className="sheet-tab">
      {renaming ? (
        <input
          aria-label={t`Sheet name`}
          autoFocus
          value={draft}
          maxLength={60}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft.trim()) onRename({ id, title: draft });
            setRenaming(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setDraft(title);
              setRenaming(false);
            }
          }}
        />
      ) : (
        <button
          aria-pressed={active}
          data-sheet-id={id}
          onClick={() => onSwitch(id)}
          onDoubleClick={() => {
            setDraft(title);
            setRenaming(true);
          }}
        >
          {title}
          {status === 'saving' ? ' ·' : status === 'error' ? ' !' : ''}
        </button>
      )}
      {active && !renaming && (
        <button
          aria-label={t`Rename sheet`}
          onClick={() => {
            setDraft(title);
            setRenaming(true);
          }}
        >
          ✎
        </button>
      )}
    </div>
  );
}

export function AddView({
  onAdd,
  ready,
}: {
  onAdd: () => void;
  ready: boolean;
}) {
  const { t } = useLingui();
  return (
    <button
      className="sheet-add"
      disabled={!ready}
      aria-label={t`Add sheet`}
      onClick={onAdd}
    >
      +
    </button>
  );
}

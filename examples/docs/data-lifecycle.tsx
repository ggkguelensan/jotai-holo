import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { holo, stateAtom } from 'jotai-holo';
import { modelLifecycle, modelRegistry, pipe } from 'jotai-holo/model';

// #region data-lifecycle
// #region draft-lifecycle
function createDraftModel() {
  const $name = stateAtom('');

  return { $name };
}

const $$draft = pipe(
  createDraftModel,

  modelLifecycle({
    load: () => sessionStorage.getItem('holo.docs.profile') ?? 'Ada Lovelace',
    restore: (draft) => draft.$name,
    snapshot: (draft) => draft.$name,
    save: ({ snapshot }) => {
      sessionStorage.setItem('holo.docs.profile', snapshot);
    },
  }),

  modelRegistry(),
);

// #endregion draft-lifecycle

function DraftView({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Name`}
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
      />
    </label>
  );
}

const Draft = holo({
  models: { draft: $$draft },
  view: DraftView,
  read: ({ draft }) => ({ name: draft.$name }),
  write: ({ draft }) => ({ onNameChange: draft.$name }),
});

function DataLifecycleDemo() {
  const { t } = useLingui();
  const [visible, setVisible] = useState(true);

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Profile draft`}</span>
      <label className="demo-checkbox">
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
        />
        {t`Mount editor`}
      </label>
      {visible && <Draft />}
      <p className="demo-note">
        {t`Hiding the editor saves your draft in this tab.`}
      </p>
    </div>
  );
}
// #endregion data-lifecycle

export default DataLifecycleDemo;

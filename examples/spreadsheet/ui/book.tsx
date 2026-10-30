import { useLingui } from '@lingui/react/macro';
import { holo } from 'jotai-holo';
import { $$workbook, retryBook } from '../workbook.js';
import { Workspace } from './workspace.js';
import { Tabs, Add } from './sheet-tabs.js';
import { BookErrorView } from './views/feedback-views.js';

function BookView({
  activeId,
  ready,
  error,
  onRetry,
}: {
  activeId: string;
  ready: boolean;
  error: boolean;
  onRetry: () => Promise<void>;
}) {
  const { t } = useLingui();
  return (
    <section className="sheet-demo" aria-label={t`Workbook`}>
      <header className="sheet-heading">
        <span className="demo-eyebrow">{t`Workbook`}</span>
      </header>
      {ready ? (
        <Workspace key={activeId} sheetId={activeId} />
      ) : (
        <p role="status">
          {error ? t`Could not load the workbook.` : t`Loading workbook…`}
        </p>
      )}
      {error && (
        <button
          onClick={() => {
            void onRetry();
          }}
        >{t`Retry`}</button>
      )}
      <nav className="sheet-tabs" aria-label={t`Sheets`}>
        <Tabs />
        <Add />
      </nav>
      {ready && error && <BookErrorView />}
    </section>
  );
}

// #region workbook-setup
const Book = holo({
  models: { book: $$workbook },
  view: BookView,
  read: ({ book }) => ({
    activeId: book.$active,
    ready: book.$ready,
    error: book.$error,
  }),
  write: { onRetry: retryBook },
});
export default Book;
// #endregion workbook-setup

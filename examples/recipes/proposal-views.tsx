import type { ProposalDraft } from './proposal-api.js';

function ProposalFields({
  draft,
  onChange,
}: {
  draft: ProposalDraft;
  onChange: (draft: ProposalDraft) => void;
}) {
  return (
    <>
      <label>
        Seats
        <input
          type="number"
          min="1"
          value={draft.seats}
          onChange={(event) =>
            onChange({
              ...draft,
              seats: Math.max(1, Number(event.target.value) || 1),
            })
          }
        />
      </label>
      <label>
        Customer comment
        <textarea
          value={draft.comment}
          onChange={(event) =>
            onChange({ ...draft, comment: event.target.value })
          }
        />
      </label>
    </>
  );
}

export type ProposalViewProps = {
  draft: ProposalDraft | null;
  total: number;
  loading: boolean;
  error: Error | null;
  onChange: (draft: ProposalDraft) => void;
};

// #region view
export function ProposalView({
  draft,
  total,
  loading,
  error,
  onChange,
}: ProposalViewProps) {
  return (
    <section aria-busy={loading}>
      {loading && !draft && <p role="status">Loading proposal…</p>}
      {error && <p role="alert">{error.message}</p>}
      {draft && <ProposalFields draft={draft} onChange={onChange} />}
      {draft && <output>Total: ${total.toFixed(2)}</output>}
    </section>
  );
}
// #endregion view

export function SaveProposalView({
  saving,
  saveError,
  onSave,
  ...props
}: ProposalViewProps & {
  saving: boolean;
  saveError: Error | null;
  onSave: () => Promise<void>;
}) {
  return (
    <section>
      <ProposalView {...props} />
      <button disabled={!props.draft || saving} onClick={() => void onSave()}>
        {saving ? 'Saving…' : 'Save proposal'}
      </button>
      {saveError && <p role="alert">{saveError.message}</p>}
    </section>
  );
}

export function LocalProposalView({
  restoring,
  saving,
  localError,
  onFlush,
  ...props
}: ProposalViewProps & {
  restoring: boolean;
  saving: boolean;
  localError: unknown;
  onFlush: () => Promise<void>;
}) {
  return (
    <section>
      <fieldset disabled={restoring}>
        <ProposalView {...props} />
      </fieldset>
      <p role="status">
        {restoring ? 'Restoring local draft…' : saving ? 'Saving…' : ''}
      </p>
      <button onClick={() => void onFlush().catch(() => undefined)}>
        Save locally now
      </button>
      {localError != null && (
        <p role="alert">Could not restore or save the local draft.</p>
      )}
    </section>
  );
}

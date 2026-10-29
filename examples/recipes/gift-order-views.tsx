import type { ReactNode } from 'react';

// #region view
export function CopiesView({
  copies,
  onCopies,
}: {
  copies: number | null;
  onCopies: (copies: number) => void;
}) {
  if (copies === null) return null;

  return (
    <label>
      Gift copies
      <input
        type="number"
        min="1"
        value={copies}
        onChange={(event) =>
          onCopies(Math.max(1, Number(event.target.value) || 1))
        }
      />
    </label>
  );
}

export function CommentView({
  comment,
  onComment,
}: {
  comment: string | null;
  onComment: (comment: string) => void;
}) {
  if (comment === null) return null;

  return (
    <label>
      Gift message
      <textarea
        value={comment}
        onChange={(event) => onComment(event.target.value)}
      />
    </label>
  );
}

export function TotalView({ total }: { total: number | null }) {
  return total === null ? null : <output>Total: ${total.toFixed(2)}</output>;
}

export function LoadingView({ showLoading }: { showLoading: boolean }) {
  return showLoading ? <p role="status">Loading gift order…</p> : null;
}

export function ErrorView({ error }: { error: Error | null }) {
  return error ? <p role="alert">{error.message}</p> : null;
}

export type GiftOrderViewProps = {
  loading: boolean;
  children: ReactNode;
};

export function GiftOrderView({ loading, children }: GiftOrderViewProps) {
  return <section aria-busy={loading}>{children}</section>;
}
// #endregion view

export function SaveButtonView({
  saving,
  canSave,
  onSave,
}: {
  saving: boolean;
  canSave: boolean;
  onSave: () => Promise<void>;
}) {
  return (
    <button disabled={!canSave} onClick={() => void onSave()}>
      {saving ? 'Saving…' : 'Save gift order'}
    </button>
  );
}

export function SaveGiftOrderView({ children }: { children: ReactNode }) {
  return <section>{children}</section>;
}

export function LocalStatusView({
  restoring,
  saving,
}: {
  restoring: boolean;
  saving: boolean;
}) {
  return (
    <p role="status">
      {restoring ? 'Restoring local draft…' : saving ? 'Saving…' : ''}
    </p>
  );
}

export function FlushButtonView({ onFlush }: { onFlush: () => Promise<void> }) {
  return (
    <button onClick={() => void onFlush().catch(() => undefined)}>
      Save locally now
    </button>
  );
}

export function LocalErrorView({ localError }: { localError: unknown }) {
  return localError != null ? (
    <p role="alert">Could not restore or save the local draft.</p>
  ) : null;
}

export function LocalGiftOrderView({
  restoring,
  children,
  feedback,
}: {
  restoring: boolean;
  children: ReactNode;
  feedback: ReactNode;
}) {
  return (
    <section>
      <fieldset disabled={restoring}>{children}</fieldset>
      {feedback}
    </section>
  );
}

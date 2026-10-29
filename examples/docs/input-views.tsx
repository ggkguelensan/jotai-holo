import { useLingui } from '@lingui/react/macro';

// #region input-contracts
export type SearchViewProps = { term: string };
export type StatusViewProps = { query: string };
// #endregion input-contracts

export function SearchView({ term }: SearchViewProps) {
  const { t } = useLingui();

  return (
    <p className="demo-note">
      {t`Mounted search View receives`}: {term || '—'}
    </p>
  );
}

export function StatusView({ query }: StatusViewProps) {
  return <output aria-live="polite">$query: {query || '∅'}</output>;
}

export function SearchTermView({
  term,
  onChange,
}: {
  term: string;
  onChange: (term: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Input prop: term`}
      <input value={term} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function SearchVisibilityView({
  visible,
  onChange,
}: {
  visible: boolean;
  onChange: (visible: boolean) => void;
}) {
  const { t } = useLingui();

  return (
    <label className="demo-checkbox">
      <input
        type="checkbox"
        checked={visible}
        onChange={(event) => onChange(event.target.checked)}
      />
      {t`Mount Search`}
    </label>
  );
}

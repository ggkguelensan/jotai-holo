import { useLingui } from '@lingui/react/macro';

export function CopiesView({ count }: { count: number }) {
  return <output className="demo-number">{count}</output>;
}

export function ToolbarView({ onAdd }: { onAdd: () => void }) {
  const { t } = useLingui();

  return <button onClick={onAdd}>{t`Add a gift copy`}</button>;
}

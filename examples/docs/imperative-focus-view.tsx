// #region focus-view
import { useImperativeHandle, useRef, type Ref } from 'react';

type SearchHandle = { focusSearch(): void };

export function SearchView({
  events,
  label,
}: {
  events: Ref<SearchHandle>;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  useImperativeHandle(events, () => ({
    focusSearch() {
      input.current?.focus();
    },
  }));

  return (
    <label>
      {label}
      <input ref={input} type="search" />
    </label>
  );
}
// #endregion focus-view

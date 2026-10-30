import { useLingui } from '@lingui/react/macro';
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { SheetKey } from '../spreadsheet/model.js';
import type { Dimensions } from '../spreadsheet/coordinates.js';
import type { StorageStatus } from '../spreadsheet/workbook.js';
import { isCellError, type CellValue } from '../spreadsheet/formulas.js';

type EditHandlers = {
  onBegin: (replace?: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onTab: (backward: boolean) => boolean;
  onMove: (delta: { row: number; column: number }) => void;
};
function navigate(
  event: KeyboardEvent<HTMLInputElement>,
  editing: boolean,
  handlers: EditHandlers,
) {
  if (event.nativeEvent.isComposing) return;
  const { key, shiftKey } = event;
  if (key === 'Escape') {
    event.preventDefault();
    handlers.onCancel();
    return;
  }
  if (key === 'Enter') {
    event.preventDefault();
    if (editing) {
      handlers.onCommit();
      handlers.onMove({ row: shiftKey ? -1 : 1, column: 0 });
    } else handlers.onBegin();
  } else if (key === 'F2') {
    event.preventDefault();
    handlers.onBegin();
  } else if (!editing && key.startsWith('Arrow')) {
    event.preventDefault();
    handlers.onMove({
      row: key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0,
      column: key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0,
    });
  } else if (
    !editing &&
    key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    event.preventDefault();
    handlers.onBegin(key);
  } else if (key === 'Backspace' && !editing) {
    event.preventDefault();
    handlers.onBegin('');
  }
}

export function CellView({
  address,
  input,
  value,
  selected,
  editing,
  draft,
  focusVersion,
  onSelect,
  onDraft,
  ...handlers
}: {
  address: string;
  input: string;
  value: CellValue;
  selected: boolean;
  editing: boolean;
  draft: string;
  focusVersion: number;
  onSelect: (address: string) => void;
  onDraft: (value: string) => void;
} & EditHandlers) {
  const { t, i18n } = useLingui();
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (selected && focusVersion > 0) element?.focus();
  }, [selected, address, focusVersion]);
  const display =
    typeof value === 'number'
      ? new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 2 }).format(
          value,
        )
      : value;
  return (
    <input
      ref={ref}
      aria-label={address}
      aria-invalid={isCellError(value) || undefined}
      data-address={address}
      data-selected={selected || undefined}
      data-numeric={typeof value === 'number' || undefined}
      data-formula={input.trim().startsWith('=') || undefined}
      className="sheet-cell"
      autoComplete="off"
      spellCheck={false}
      maxLength={512}
      readOnly={!editing}
      title={
        isCellError(value) ? t`Check the formula and its references.` : input
      }
      value={editing ? draft : display}
      onChange={(event) => onDraft(event.target.value)}
      onFocus={() => onSelect(address)}
      onDoubleClick={() => handlers.onBegin()}
      onBlur={() => handlers.onCommit()}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          if (handlers.onTab(event.shiftKey)) event.preventDefault();
        } else navigate(event, editing, handlers);
      }}
    />
  );
}

export function FormulaView({
  address,
  expression,
  onBegin,
  onDraft,
  ...handlers
}: {
  address: string;
  expression: string;
  onDraft: (value: string) => void;
} & EditHandlers) {
  const { t } = useLingui();
  return (
    <label className="sheet-formula">
      <span className="sheet-address">{address}</span>
      <span className="sheet-fx" aria-hidden="true">
        ƒx
      </span>
      <input
        aria-label={t`Formula for the selected cell`}
        value={expression}
        maxLength={512}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => onBegin()}
        onChange={(event) => onDraft(event.target.value)}
        onBlur={handlers.onCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            event.key === 'Enter' ? handlers.onCommit() : handlers.onCancel();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function DimensionView({
  dimension,
  value,
  dimensions,
  onResize,
}: {
  dimension: keyof Dimensions;
  value: number;
  dimensions: Dimensions;
  onResize: (size: Dimensions) => void;
}) {
  const { t } = useLingui();
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState(false);
  const focused = useRef(false);
  useLayoutEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  const apply = (text: string) => {
    const next = Number(text);
    if (!text.trim() || !Number.isInteger(next) || next < 1 || next > 1000) {
      setError(true);
      return;
    }
    onResize({ ...dimensions, [dimension]: next });
    setError(false);
    setDraft(String(next));
  };
  const label = dimension === 'rows' ? t`Rows` : t`Columns`;
  return (
    <div className="sheet-dimension">
      <label>
        <span>{label}</span>
        <input
          aria-label={label}
          aria-invalid={error || undefined}
          inputMode="numeric"
          value={draft}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(false);
          }}
          onBlur={() => {
            focused.current = false;
            apply(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              apply(draft);
            }
            if (event.key === 'Escape') {
              setDraft(String(value));
              setError(false);
            }
          }}
        />
      </label>
      <button
        aria-label={dimension === 'rows' ? t`Fewer rows` : t`Fewer columns`}
        disabled={value <= 1}
        onClick={() => apply(String(value - 1))}
      >
        −
      </button>
      <button
        aria-label={dimension === 'rows' ? t`More rows` : t`More columns`}
        disabled={value >= 1000}
        onClick={() => apply(String(value + 1))}
      >
        +
      </button>
      {error && (
        <small role="alert">{t`Enter a whole number from 1 to 1000.`}</small>
      )}
    </div>
  );
}

export function SheetStatusView({
  status,
  sheetId,
  onRetry,
}: SheetKey & {
  status: StorageStatus;
  onRetry: (id: string) => Promise<void>;
}) {
  const { t } = useLingui();
  return (
    <div className="sheet-status" data-state={status} role="status">
      {status === 'loading'
        ? t`Loading sheet…`
        : status === 'saving'
          ? t`Saving…`
          : status === 'error'
            ? t`Could not save or load this sheet.`
            : t`Saved locally`}
      {status === 'error' && (
        <button
          onClick={() => {
            void onRetry(sheetId);
          }}
        >{t`Retry`}</button>
      )}
    </div>
  );
}

export function CameraView({
  address,
  onSelect,
  onMove,
}: {
  address: string;
  onSelect: (address: string) => void;
  onMove: EditHandlers['onMove'];
}) {
  const { t } = useLingui();
  const [draft, setDraft] = useState(address);
  const [error, setError] = useState(false);
  useLayoutEffect(() => setDraft(address), [address]);
  return (
    <div className="sheet-camera">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSelect(draft.trim().toUpperCase());
            setError(false);
          } catch {
            setError(true);
          }
        }}
      >
        <label>
          {t`Go to cell`}
          <input
            value={draft}
            aria-invalid={error || undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(false);
            }}
          />
        </label>
        <button type="submit">{t`Go`}</button>
      </form>
      <div className="sheet-directions">
        <button
          aria-label={t`Move left`}
          onClick={() => onMove({ row: 0, column: -1 })}
        >
          ←
        </button>
        <button
          aria-label={t`Move up`}
          onClick={() => onMove({ row: -1, column: 0 })}
        >
          ↑
        </button>
        <button
          aria-label={t`Move down`}
          onClick={() => onMove({ row: 1, column: 0 })}
        >
          ↓
        </button>
        <button
          aria-label={t`Move right`}
          onClick={() => onMove({ row: 0, column: 1 })}
        >
          →
        </button>
      </div>
      {error && (
        <small role="alert">{t`Choose an address inside this sheet.`}</small>
      )}
    </div>
  );
}

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

export function TableViewportView({
  size,
  onWindow,
  children,
}: {
  size: Dimensions;
  onWindow: (size: Dimensions) => void;
  children: ReactNode;
}) {
  const { t } = useLingui();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      onWindow({ columns: entry!.contentRect.width < 430 ? 2 : 4, rows: 8 }),
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, [onWindow]);
  return (
    <div className="sheet-viewport" ref={ref}>
      <table
        className="sheet-table"
        role="grid"
        aria-label={t`Gift budget`}
        aria-rowcount={size.rows + 1}
        aria-colcount={size.columns + 1}
      >
        {children}
      </table>
    </div>
  );
}

export function SheetHelpView() {
  const { t } = useLingui();
  return (
    <p className="sheet-help">{t`Arrows select. Enter edits; Enter again saves. Escape cancels. Double-click a tab to rename it.`}</p>
  );
}

export function BookErrorView() {
  const { t } = useLingui();
  return (
    <p role="alert">{t`Could not save the sheet list. Your open sheets remain in memory.`}</p>
  );
}

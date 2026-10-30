import type { KeyboardEvent } from 'react';

export type EditHandlers = {
  onBegin: (replace?: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onTab: (backward: boolean) => boolean;
  onMove: (delta: { row: number; column: number }) => void;
};

export function navigate(
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

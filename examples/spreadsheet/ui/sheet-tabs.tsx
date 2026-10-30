import { flatMapAtom } from 'jotai-holo/vanilla';
import { holo, holoList } from 'jotai-holo';
import { $$workbook, switchSheet, addSheet } from '../workbook.js';
import type { StorageStatus } from '../models/types.js';
import { SheetTabView, AddView } from './views/sheet-tabs-views.js';

function TabBindingView({
  id,
  title,
  activeId,
  statuses,
  onSwitch,
  onRename,
}: {
  id: string;
  title: string;
  activeId: string;
  statuses: Record<string, StorageStatus>;
  onSwitch: (id: string) => void;
  onRename: (value: { id: string; title: string }) => void;
}) {
  return (
    <SheetTabView
      id={id}
      title={title}
      active={activeId === id}
      status={statuses[id]}
      onSwitch={onSwitch}
      onRename={onRename}
    />
  );
}

const Tab = holo({
  models: { book: $$workbook },
  view: TabBindingView,
  read: ({ book }) => ({ activeId: book.$active, statuses: book.$statuses }),
  write: ({ book }) => ({
    onSwitch: switchSheet,
    onRename: book.renameSheet,
  }),
});

const $tabs = flatMapAtom($$workbook(), (book) => book.$sheets);

export const Tabs = holoList({
  source: $tabs,
  view: Tab,
  getKey: (sheet) => sheet.id,
  mapItem: (sheet) => ({ id: sheet.id, title: sheet.title }),
});

export const Add = holo({
  models: { book: $$workbook },
  view: AddView,
  read: ({ book }) => ({ ready: book.$ready }),
  write: { onAdd: addSheet },
});

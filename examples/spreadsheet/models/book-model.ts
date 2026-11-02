import { actionAtom, stateAtom, ion } from 'jotai-holo/vanilla';
import type {
  SheetDescriptor,
  ViewSnapshot,
  BookDocument,
  StorageStatus,
} from './types.js';

export function createWorkbookModel() {
  const $sheets = stateAtom<SheetDescriptor[]>([]);
  const $active = stateAtom('');
  const $views = stateAtom<Record<string, ViewSnapshot>>({});
  const $ready = stateAtom(false);
  const $error = stateAtom(false);
  const $saving = stateAtom(false);
  const $statuses = stateAtom<Record<string, StorageStatus>>({});
  const $document = ion(
    { sheets: $sheets, activeSheetId: $active, views: $views },
    (snapshot): BookDocument => ({ version: 1, ...snapshot }),
  );
  const load = actionAtom((_get, set, document: BookDocument) => {
    set($sheets, document.sheets);
    set($views, document.views);
    set($active, document.activeSheetId);
    set($ready, true);
  });
  const switchSheet = actionAtom((get, set, id: string) => {
    if (!get($sheets).some((sheet) => sheet.id === id)) return;
    set($active, id);
  });
  const addSheet = actionAtom((get, set) => {
    if (!get($ready)) return;
    const id = crypto.randomUUID();
    set($sheets, [
      ...get($sheets),
      { id, title: `Sheet ${get($sheets).length + 1}` },
    ]);
    set(switchSheet, id);
  });
  const renameSheet = actionAtom(
    (get, set, { id, title }: { id: string; title: string }) => {
      const name = title.trim();
      if (!name || name.length > 60) return;
      set(
        $sheets,
        get($sheets).map((sheet) =>
          sheet.id === id ? { ...sheet, title: name } : sheet,
        ),
      );
    },
  );
  return {
    $sheets,
    $active,
    $views,
    $ready,
    $error,
    $saving,
    $statuses,
    $document,
    load,
    switchSheet,
    addSheet,
    renameSheet,
  };
}

export type WorkbookModel = ReturnType<typeof createWorkbookModel>;

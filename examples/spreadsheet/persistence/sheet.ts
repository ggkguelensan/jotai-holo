import { ion } from 'jotai-holo/vanilla';
import type { ModelConnectionContext } from 'jotai-holo/model';
import { persist, type Persistence } from 'jotai-holo/persist';
import type { WorkbookModel } from '../models/book-model.js';
import { $$sheet, type SheetModel } from '../models/sheet-model.js';
import type {
  SheetKey,
  SheetDocument,
  StorageStatus,
} from '../models/types.js';
import seed from '../gift-budget.json';
import { $storage, sheetKey } from './config.js';

type SheetPersistence = {
  disk: Persistence<SheetDocument>;
  retry?: (() => Promise<void>) | undefined;
  unpin?: (() => void) | undefined;
  stop?: (() => void) | undefined;
};

const resources = new WeakMap<SheetModel, SheetPersistence>();

export function connectSheet(
  sheet: SheetModel,
  { initial, store }: ModelConnectionContext<SheetKey>,
  book: WorkbookModel,
) {
  let state = resources.get(sheet);
  if (!state) {
    const storage = store.get($storage);
    const disk = persist({
      read: sheet.$document,
      restore: sheet.load,
      key: sheetKey(initial.sheetId),
      storage: {
        async read(key) {
          const saved = await storage.read(key);
          return saved === undefined
            ? initial.sheetId === 'gifts'
              ? seed
              : { rows: 100, columns: 40, cells: {} }
            : saved;
        },
        write: (key, document) => storage.write(key, document),
      },
      codec: {
        decode: (value) => value as SheetDocument,
        encode: (document) => document,
      },
      save: { debounce: 250 },
    });
    state = { disk };
    resources.set(sheet, state);
  }
  const { disk } = state;
  const resource = state;
  resource.stop?.();
  let connected = true;
  let acquiring = false;
  const $status = ion({
    restoring: disk.$restoring,
    saving: disk.$saving,
    dirty: disk.$dirty,
    error: disk.$error,
  });
  const reflectStatus = () => {
    const status = store.get($status);
    // An unsaved or loading sheet must survive registry eviction.
    if (status.restoring || status.dirty || status.error !== undefined) {
      if (!resource.unpin && !acquiring) {
        acquiring = true;
        try {
          resource.unpin = $$sheet.acquire(store, {
            key: ['sheet', initial.sheetId],
            initial,
          }).release;
        } finally {
          acquiring = false;
        }
      }
    } else {
      const release = resource.unpin;
      resource.unpin = undefined;
      release?.();
    }
    const value: StorageStatus =
      status.error !== undefined
        ? 'error'
        : status.restoring
          ? 'loading'
          : status.saving || status.dirty
            ? 'saving'
            : 'saved';
    if (!connected && !resource.unpin) resource.stop?.();
    store.set(book.$statuses, (current) => ({
      ...current,
      [initial.sheetId]: value,
    }));
  };
  const stop = store.sub($status, reflectStatus);
  resource.stop = stop;
  let release = disk.connect(store) ?? (() => {});
  reflectStatus();
  const retry = async () => {
    if (!store.get(sheet.$loaded) && !store.get(disk.$restoring)) {
      release();
      release = disk.connect(store) ?? (() => {});
    }
    await store.set(disk.flush).catch(() => {});
  };
  state.retry = retry;
  return () => {
    connected = false;
    if (state.retry === retry) state.retry = undefined;
    release();
    if (!resource.unpin) stop();
  };
}

export async function retrySheet(sheet: SheetModel) {
  await resources.get(sheet)?.retry?.();
}

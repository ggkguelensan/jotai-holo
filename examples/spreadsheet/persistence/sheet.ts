import type { ModelConnectionContext } from 'jotai-holo/model';
import type { WorkbookModel } from '../models/book-model.js';
import { $$sheet, type SheetModel } from '../models/sheet-model.js';
import type {
  SheetKey,
  SheetDocument,
  StorageStatus,
} from '../models/types.js';
import { initialDocument } from '../datasets.js';
import { $storage, sheetKey } from './config.js';

type SheetRuntime = {
  initialized: boolean;
  restoring: boolean;
  saved: number;
  latest: number;
  timer?: ReturnType<typeof setTimeout>;
  worker?: Promise<void> | undefined;
  pin?: (() => void) | undefined;
  flush: () => Promise<void>;
  restore?: (() => Promise<void>) | undefined;
};

const states = new WeakMap<SheetModel, SheetRuntime>();

export function connectSheet(
  sheet: SheetModel,
  { initial, store }: ModelConnectionContext<SheetKey>,
  book: WorkbookModel,
) {
  const storage = store.get($storage);
  const status = (value: StorageStatus) =>
    store.set(book.$statuses, (current) => ({
      ...current,
      [initial.sheetId]: value,
    }));
  let runtime = states.get(sheet);
  const pin = () => {
    runtime!.pin ??= $$sheet.acquire(store, {
      key: ['sheet', initial.sheetId],
      initial,
    }).release;
  };
  if (!runtime) {
    runtime = {
      initialized: false,
      restoring: false,
      saved: 0,
      latest: 0,
      flush: async () => {},
    };
    const state = runtime;
    state.flush = () => {
      if (state.restoring) return state.worker ?? Promise.resolve();
      if (!state.initialized) return Promise.resolve();
      state.latest = store.get(sheet.$revision);
      if (state.saved === state.latest) {
        if (!state.worker) {
          state.pin?.();
          state.pin = undefined;
        }
        return Promise.resolve();
      }
      if (state.worker) return state.worker;
      pin();
      status('saving');
      state.worker = (async () => {
        while (state.saved !== state.latest) {
          const revision = state.latest;
          const document = store.get(sheet.$document);
          await storage.write(sheetKey(initial.sheetId), document);
          state.saved = revision;
        }
        status('saved');
        state.pin?.();
        state.pin = undefined;
      })()
        .catch((error) => {
          status('error');
          throw error;
        })
        .finally(() => {
          state.worker = undefined;
        });
      return state.worker;
    };
    states.set(sheet, state);
  }
  const state = runtime;
  const stop = store.sub(sheet.$revision, () => {
    if (!state.initialized || state.restoring) return;
    state.latest = store.get(sheet.$revision);
    pin();
    status('saving');
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      void state.flush().catch(() => {});
    }, 250);
  });
  const restore = () => {
    if (state.restoring) return state.worker ?? Promise.resolve();
    state.restoring = true;
    pin();
    status('loading');
    state.worker = storage
      .read(sheetKey(initial.sheetId))
      .then((data) => {
        store.set(
          sheet.load,
          (data === undefined
            ? initialDocument(
                store
                  .get(book.$sheets)
                  .find((item) => item.id === initial.sheetId) ?? {
                  id: initial.sheetId,
                  title: '',
                },
              )
            : data) as SheetDocument,
        );
        state.initialized = true;
        state.restoring = false;
        state.latest = store.get(sheet.$revision);
      })
      .catch((error) => {
        state.restoring = false;
        status('error');
        throw error;
      })
      .finally(() => {
        state.worker = undefined;
      });
    return state.worker.then(() => state.flush());
  };
  state.restore = restore;
  if (!state.initialized && !state.restoring) void restore().catch(() => {});
  return () => {
    stop();
    clearTimeout(state.timer);
    pin();
    queueMicrotask(() => {
      void state.flush().catch(() => {});
    });
  };
}

export async function retrySheet(sheet: SheetModel) {
  const state = states.get(sheet);
  if (state)
    await (state.initialized ? state.flush() : state.restore?.())?.catch(
      () => {},
    );
}

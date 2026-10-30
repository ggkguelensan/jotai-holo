import { atom } from 'jotai/vanilla';
import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import {
  createSpreadsheet,
  type SheetDocument,
  type SheetKey,
  type SheetModel,
  type ViewKey,
} from './model.js';
import { browserStorage, type DocumentStorage } from './storage.js';
import giftBudget from './gift-budget.json';
import { point, type Point } from './coordinates.js';

type Descriptor = { id: string; title: string };
type ViewSnapshot = { selected: string; camera: Point };
type BookDocument = {
  version: 1;
  sheets: Descriptor[];
  activeSheetId: string;
  views: Record<string, ViewSnapshot>;
};
export type StorageStatus = 'loading' | 'saving' | 'saved' | 'error';

// Definitions are shared; instances and configured storage belong to each store.
export const $storage = atom<DocumentStorage>(browserStorage());
const seed = giftBudget;
const workbookId = 'gift-budget-v1';

// #region workbook
const registry = createSpreadsheet();
export const { selectCell } = registry;
const sheetKey = (sheetId: string) => `${workbookId}/sheet/${sheetId}`;
const bookKey = `${workbookId}/book`;

function createWorkbookModel() {
  const $sheets = stateAtom<Descriptor[]>([]);
  const $active = stateAtom('');
  const $views = stateAtom<Record<string, ViewSnapshot>>({});
  const $ready = stateAtom(false);
  const $error = stateAtom(false);
  const $saving = stateAtom(false);
  const $statuses = stateAtom<Record<string, StorageStatus>>({});
  const $document = atom(
    (get): BookDocument => ({
      version: 1,
      sheets: get($sheets),
      activeSheetId: get($active),
      views: get($views),
    }),
  );
  const switchSheet = actionAtom((get, set, id: string) => {
    if (!get($sheets).some((sheet) => sheet.id === id)) return;
    const old = get($active);
    if (old) set(get(registry.selectView({ sheetId: old })).commit);
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
    switchSheet,
    addSheet,
    renameSheet,
  };
}

type BookRuntime = {
  initialized: boolean;
  writing?: Promise<void> | undefined;
  latest?: BookDocument | undefined;
  retry?: (() => Promise<void>) | undefined;
};
const bookStates = new WeakMap<object, BookRuntime>();
export const $$workbook = pipe(
  createWorkbookModel,
  modelConnection((book, { store }) => {
    const storage = store.get($storage);
    let runtime = bookStates.get(book);
    if (!runtime) bookStates.set(book, (runtime = { initialized: false }));
    const state = runtime;
    let active = true;
    const save = (): Promise<void> => {
      state.latest = store.get(book.$document);
      if (state.writing) return state.writing;
      store.set(book.$saving, true);
      let succeeded = false;
      state.writing = (async () => {
        while (state.latest) {
          const snapshot = state.latest;
          state.latest = undefined;
          try {
            await storage.write(bookKey, snapshot);
          } catch (error) {
            state.latest ??= snapshot;
            throw error;
          }
        }
        store.set(book.$error, false);
        succeeded = true;
      })()
        .catch((error) => {
          store.set(book.$error, true);
          throw error;
        })
        .finally(() => {
          state.writing = undefined;
          store.set(book.$saving, false);
          if (succeeded && state.latest) void save().catch(() => {});
        });
      return state.writing;
    };
    const load = async () => {
      const data = await storage.read(bookKey);
      if (!active) return;
      const saved = data as BookDocument | undefined;
      if (
        saved !== undefined &&
        (!saved ||
          saved.version !== 1 ||
          !Array.isArray(saved.sheets) ||
          !saved.sheets.length ||
          !saved.sheets.every(
            (item) =>
              item &&
              typeof item.id === 'string' &&
              item.id.length > 0 &&
              typeof item.title === 'string',
          ) ||
          new Set(saved.sheets.map((item) => item.id)).size !==
            saved.sheets.length ||
          !saved.sheets.some((item) => item.id === saved.activeSheetId))
      )
        throw new TypeError('Invalid workbook.');
      store.set(
        book.$sheets,
        saved?.sheets ?? [
          { id: 'gifts', title: 'Gift bundle' },
          { id: 'scratch', title: 'Scratchpad' },
        ],
      );
      store.set(
        book.$views,
        saved?.views &&
          typeof saved.views === 'object' &&
          !Array.isArray(saved.views)
          ? saved.views
          : {},
      );
      store.set(book.$active, saved?.activeSheetId ?? 'gifts');
      state.initialized = true;
      store.set(book.$ready, true);
      await save();
    };
    const retry = async () => {
      try {
        await (state.initialized ? save() : load());
      } catch {
        if (active) store.set(book.$error, true);
      }
    };
    state.retry = retry;
    const stop = store.sub(book.$document, () => {
      if (state.initialized) void save().catch(() => {});
    });
    if (!state.initialized) void retry();
    return () => {
      active = false;
      stop();
      state.retry = undefined;
      if (state.initialized)
        queueMicrotask(() => {
          void save().catch(() => {});
        });
    };
  }),
  modelRegistry(),
);
export const retryBook = actionAtom(async (get) => {
  await bookStates.get(get($$workbook()))?.retry?.();
});

type Runtime = {
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
const states = new WeakMap<SheetModel, Runtime>();
export const $$sheet = pipe(
  registry.$$sheet,
  modelConnection((sheet, { initial, store }) => {
    const storage = store.get($storage);
    const book = store.get($$workbook());
    const status = (value: StorageStatus) =>
      store.set(book.$statuses, (current) => ({
        ...current,
        [initial.sheetId]: value,
      }));
    let runtime = states.get(sheet);
    const pin = () => {
      runtime!.pin ??= registry.$$sheet.acquire(store, {
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
              ? initial.sheetId === 'gifts'
                ? seed
                : { rows: 100, columns: 40, cells: {} }
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
  }),
);
export const selectSheet = ({ sheetId }: SheetKey) =>
  $$sheet({ key: ['sheet', sheetId], initial: { sheetId } });

export const $$view = pipe(
  registry.$$view,
  modelConnection((view, { initial, store }) => {
    const book = store.get($$workbook());
    const key = `${initial.sheetId}/${initial.viewId ?? 'main'}`;
    const saved = store.get(book.$views)[key];
    if (saved) {
      try {
        point(saved.selected);
        if (
          !saved.camera ||
          !Number.isInteger(saved.camera.row) ||
          !Number.isInteger(saved.camera.column) ||
          saved.camera.row < 0 ||
          saved.camera.column < 0
        )
          throw new TypeError('Invalid camera.');
        store.set(view.$selected, saved.selected);
        store.set(view.$camera, saved.camera);
      } catch {
        /* Optional view metadata can be discarded without changing document data. */
      }
    } else if (initial.sheetId === 'gifts' && seed.selected) {
      store.set(view.$selected, seed.selected);
    }
    store.set(view.adjust);
    const snapshot = atom((get) => ({
      selected: get(view.$selected),
      camera: get(view.$camera),
    }));
    const save = () =>
      store.set(book.$views, (views) => ({
        ...views,
        [key]: store.get(snapshot),
      }));
    const stop = store.sub(snapshot, save);
    return () => {
      store.set(view.commit);
      save();
      stop();
    };
  }),
);
export const selectView = ({ sheetId, viewId = 'main' }: ViewKey) =>
  $$view({ key: ['view', sheetId, viewId], initial: { sheetId, viewId } });
export const retry = actionAtom(async (get, _set, sheetId: string) => {
  const sheet = get(selectSheet({ sheetId }));
  const state = states.get(sheet);
  if (state)
    await (state.initialized ? state.flush() : state.restore?.())?.catch(
      () => {},
    );
});
export const reset = actionAtom((get, set, sheetId: string) => {
  const sheet = get(selectSheet({ sheetId }));
  set(sheet.load, seed);
  const view = get(selectView({ sheetId }));
  set(view.cancel);
  set(view.select, seed.selected ?? 'A1');
});
// #endregion workbook

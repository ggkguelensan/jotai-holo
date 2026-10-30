import type { ModelConnectionContext } from 'jotai-holo/model';
import type { WorkbookModel } from '../models/book-model.js';
import type { BookDocument } from '../models/types.js';
import { $storage, bookKey } from './config.js';

type BookRuntime = {
  initialized: boolean;
  writing?: Promise<void> | undefined;
  latest?: BookDocument | undefined;
  retry?: (() => Promise<void>) | undefined;
};

const bookStates = new WeakMap<object, BookRuntime>();

export function connectWorkbook(
  book: WorkbookModel,
  { store }: ModelConnectionContext<undefined>,
) {
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
}

export async function retryWorkbook(book: WorkbookModel) {
  await bookStates.get(book)?.retry?.();
}

import { ion } from 'jotai-holo/vanilla';
import type { ModelConnectionContext } from 'jotai-holo/model';
import { persist, type Persistence } from 'jotai-holo/persist';
import type { WorkbookModel } from '../models/book-model.js';
import type { BookDocument } from '../models/types.js';
import initialBook from '../workbook.json';
import { $storage, bookKey } from './config.js';
import { bookCodec } from './book-codec.js';

type BookPersistence = {
  disk: Persistence<BookDocument>;
  retry?: (() => Promise<void>) | undefined;
};

// Keep the resource, including pending writes, for the retained model.
const resources = new WeakMap<WorkbookModel, BookPersistence>();

export function connectWorkbook(
  book: WorkbookModel,
  { store }: ModelConnectionContext<undefined>,
) {
  let state = resources.get(book);
  if (!state) {
    const storage = store.get($storage);
    const disk = persist({
      read: book.$document,
      restore: book.load,
      key: bookKey,
      storage: {
        async read(key) {
          const saved = await storage.read(key);
          return saved === undefined ? initialBook : saved;
        },
        write: (key, document) => storage.write(key, document),
      },
      codec: bookCodec,
    });
    state = { disk };
    resources.set(book, state);
  }
  const { disk } = state;
  let release = disk.connect(store) ?? (() => {});
  const $status = ion({ saving: disk.$saving, error: disk.$error });
  const reflectStatus = () => {
    const status = store.get($status);
    store.set(book.$saving, status.saving);
    store.set(book.$error, status.error !== undefined);
  };
  const stop = store.sub($status, reflectStatus);
  reflectStatus();

  const retry = async () => {
    if (!store.get(book.$ready) && !store.get(disk.$restoring)) {
      release();
      release = disk.connect(store) ?? (() => {});
    }
    // persist exposes failures through $error; the Retry button does not throw.
    await store.set(disk.flush).catch(() => {});
  };
  state.retry = retry;
  return () => {
    stop();
    if (state.retry === retry) state.retry = undefined;
    release();
  };
}

export async function retryWorkbook(book: WorkbookModel) {
  await resources.get(book)?.retry?.();
}

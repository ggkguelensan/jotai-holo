import { atom } from 'jotai/vanilla';
import type { ModelConnectionContext } from 'jotai-holo/model';
import type { WorkbookModel } from '../models/book-model.js';
import type { SheetViewModel } from '../models/view-model.js';
import type { ViewKey } from '../models/types.js';
import { point } from '../coordinates.js';
import seed from '../gift-budget.json';

export function connectView(
  view: SheetViewModel,
  { initial, store }: ModelConnectionContext<ViewKey>,
  book: WorkbookModel,
) {
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
}

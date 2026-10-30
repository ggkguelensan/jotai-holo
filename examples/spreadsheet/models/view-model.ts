import { atom } from 'jotai/vanilla';
import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { modelConnection, modelRegistry, pipe } from 'jotai-holo/model';
import {
  addressOf,
  clampPoint,
  contains,
  point,
  reveal,
  type Dimensions,
  type Point,
} from '../coordinates.js';
import { selectSheet } from './sheet-model.js';
import type { ViewKey } from './types.js';

export function createViewModel({ sheetId }: ViewKey) {
  const sheet = selectSheet({ sheetId });
  const $selected = stateAtom('A1');
  const $camera = stateAtom<Point>({ row: 0, column: 0 });
  const $window = stateAtom<Dimensions>({ rows: 8, columns: 4 });
  const $editing = stateAtom(false);
  const $focus = stateAtom(0);
  const $draft = stateAtom('');
  const $size = atom((get) => get(get(sheet).$dimensions));
  const commit = actionAtom((get, set) => {
    if (!get($editing)) return;
    set(get(sheet).setCell, { address: get($selected), value: get($draft) });
    set($editing, false);
  });
  const select = actionAtom((get, set, address: string) => {
    const p = point(address);
    if (!contains(get($size), p))
      throw new RangeError('Address is outside the sheet.');
    set(commit);
    set($selected, address);
    set($camera, reveal(get($camera), p, get($window), get($size)));
  });
  const begin = actionAtom((get, set, replace?: string) => {
    set($draft, replace ?? get(get(sheet).inputAt(get($selected))));
    set($editing, true);
  });
  const cancel = actionAtom((_get, set) => set($editing, false));
  const move = actionAtom((get, set, delta: Point) => {
    const current = point(get($selected));
    set(
      select,
      addressOf(
        clampPoint(
          {
            row: current.row + delta.row,
            column: current.column + delta.column,
          },
          get($size),
        ),
      ),
    );
    set($focus, (n) => n + 1);
  });
  const tab = actionAtom((get, set, backward: boolean) => {
    set(commit);
    const current = point(get($selected));
    const size = get($size);
    const next =
      current.row * size.columns + current.column + (backward ? -1 : 1);
    if (next < 0 || next >= size.rows * size.columns) return false;
    set(
      select,
      addressOf({
        row: Math.floor(next / size.columns),
        column: next % size.columns,
      }),
    );
    set($focus, (n) => n + 1);
    return true;
  });
  const adjust = actionAtom((get, set) => {
    set(commit);
    const p = clampPoint(point(get($selected)), get($size));
    set($selected, addressOf(p));
    set($camera, reveal(get($camera), p, get($window), get($size)));
  });
  const setWindow = actionAtom((get, set, window: Dimensions) => {
    const current = get($window);
    if (current.rows === window.rows && current.columns === window.columns)
      return;
    set($window, window);
    set(adjust);
  });
  const $formula = atom((get) =>
    get($editing) ? get($draft) : get(get(sheet).inputAt(get($selected))),
  );
  return {
    $selected,
    $camera,
    $window,
    $focus,
    $editing,
    $draft,
    $formula,
    $size,
    select,
    begin,
    commit,
    cancel,
    move,
    tab,
    adjust,
    setWindow,
  };
}

export const $$view = pipe(
  createViewModel,
  modelConnection((view, { store }) => {
    const stop = store.sub(view.$size, () => store.set(view.adjust));
    store.set(view.adjust);
    return stop;
  }),
  modelRegistry({ retainTime: 0 }),
);

export const selectView = ({ sheetId, viewId = 'main' }: ViewKey) =>
  $$view({ key: ['view', sheetId, viewId], initial: { sheetId, viewId } });

export type SheetViewModel = ReturnType<typeof createViewModel>;

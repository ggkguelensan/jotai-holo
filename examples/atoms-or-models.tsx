// #region atom-imports
import { atom } from 'jotai';
import { eventAtom, holo } from 'jotai-holo';
// #endregion atom-imports
// #region model-imports
import { modelRegistry, pipe } from 'jotai-holo/model';
// #endregion model-imports

// #region toolbar-view
function ToolbarView({
  title,
  theme,
  onThemeChange,
  onHelp,
}: {
  title: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onHelp: () => void;
}) {
  return (
    <header>
      <h2>{title}</h2>
      <button
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
      >
        Theme: {theme}
      </button>
      <button onClick={() => onHelp()}>Help</button>
    </header>
  );
}
// #endregion toolbar-view

// #region global-atoms
type Theme = 'light' | 'dark';

export const $theme = atom<Theme>('light');

export const helpRequested = eventAtom();

export const Toolbar = holo({
  view: ToolbarView,

  read: { theme: $theme },

  write: {
    onThemeChange: $theme,
    onHelp: helpRequested,
  },

  static: { title: 'Workspace' },
});
// #endregion global-atoms

// #region factory
export function createFiltersModel() {
  const $term = atom('');
  const $inStockOnly = atom(false);

  return { $term, $inStockOnly };
}

export const $$catalogFilters = createFiltersModel();
export const $$orderFilters = createFiltersModel();
// #endregion factory

// #region filters-view
function FiltersView({
  term,
  inStockOnly,
  onTermChange,
  onStockChange,
}: {
  term: string;
  inStockOnly: boolean;
  onTermChange: (term: string) => void;
  onStockChange: (checked: boolean) => void;
}) {
  return (
    <section>
      <label>
        Search
        <input
          value={term}
          onChange={(event) => onTermChange(event.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(event) => onStockChange(event.target.checked)}
        />
        In stock only
      </label>
    </section>
  );
}
// #endregion filters-view

// #region direct-model
export const CatalogFilters = holo({
  view: FiltersView,

  read: {
    term: $$catalogFilters.$term,
    inStockOnly: $$catalogFilters.$inStockOnly,
  },

  write: {
    onTermChange: $$catalogFilters.$term,
    onStockChange: $$catalogFilters.$inStockOnly,
  },
});
// #endregion direct-model

// #region keyed-model
const $$filters = pipe(createFiltersModel, modelRegistry());

export const ProductFilters = holo({
  models: {
    filters: (props: { catalogId: string }) =>
      $$filters({ key: ['catalog', props.catalogId] }),
  },

  view: FiltersView,

  read: ({ filters }) => ({
    term: filters.$term,
    inStockOnly: filters.$inStockOnly,
  }),

  write: ({ filters }) => ({
    onTermChange: filters.$term,
    onStockChange: filters.$inStockOnly,
  }),
});
// #endregion keyed-model

// #region usage
export const hardwareFilters = <ProductFilters catalogId="hardware" />;
export const furnitureFilters = <ProductFilters catalogId="furniture" />;
// #endregion usage

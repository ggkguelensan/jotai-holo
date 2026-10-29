// #region atom-imports
import { atom } from 'jotai';
import { eventAtom, holo } from 'jotai-holo';
// #endregion atom-imports
// #region model-imports
import { modelRegistry, pipe } from 'jotai-holo/model';
// #endregion model-imports

// #region toolbar-view
function ThemeView({
  theme,
  onThemeChange,
}: {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  return (
    <button onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}>
      Theme: {theme}
    </button>
  );
}

function HelpView({ onHelp }: { onHelp: () => void }) {
  return <button onClick={() => onHelp()}>Help</button>;
}

function ToolbarView({ title }: { title: string }) {
  return (
    <header>
      <h2>{title}</h2>
      <ThemeControl />
      <Help />
    </header>
  );
}
// #endregion toolbar-view

// #region global-atoms
type Theme = 'light' | 'dark';

export const $theme = atom<Theme>('light');

export const helpRequested = eventAtom();

const ThemeControl = holo({
  view: ThemeView,
  read: { theme: $theme },
  write: { onThemeChange: $theme },
});

const Help = holo({
  view: HelpView,
  write: { onHelp: helpRequested },
});

export const Toolbar = holo({
  view: ToolbarView,
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
function TermView({
  term,
  onTermChange,
}: {
  term: string;
  onTermChange: (term: string) => void;
}) {
  return (
    <label>
      Search
      <input
        value={term}
        onChange={(event) => onTermChange(event.target.value)}
      />
    </label>
  );
}

function StockView({
  inStockOnly,
  onStockChange,
}: {
  inStockOnly: boolean;
  onStockChange: (checked: boolean) => void;
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={inStockOnly}
        onChange={(event) => onStockChange(event.target.checked)}
      />
      In stock only
    </label>
  );
}
// #endregion filters-view

// #region direct-model
const CatalogTerm = holo({
  view: TermView,
  read: { term: $$catalogFilters.$term },
  write: { onTermChange: $$catalogFilters.$term },
});

const CatalogStock = holo({
  view: StockView,
  read: { inStockOnly: $$catalogFilters.$inStockOnly },
  write: { onStockChange: $$catalogFilters.$inStockOnly },
});

export function CatalogFilters() {
  return (
    <section>
      <CatalogTerm />
      <CatalogStock />
    </section>
  );
}
// #endregion direct-model

// #region keyed-model
const $$filters = pipe(createFiltersModel, modelRegistry());

const ProductTerm = holo({
  models: {
    filters: (props: { catalogId: string }) =>
      $$filters({ key: ['catalog', props.catalogId] }),
  },
  view: TermView,
  read: ({ filters }) => ({ term: filters.$term }),
  write: ({ filters }) => ({ onTermChange: filters.$term }),
});

const ProductStock = holo({
  models: {
    filters: (props: { catalogId: string }) =>
      $$filters({ key: ['catalog', props.catalogId] }),
  },
  view: StockView,
  read: ({ filters }) => ({ inStockOnly: filters.$inStockOnly }),
  write: ({ filters }) => ({ onStockChange: filters.$inStockOnly }),
});

export function ProductFilters({ catalogId }: { catalogId: string }) {
  return (
    <section>
      <ProductTerm catalogId={catalogId} />
      <ProductStock catalogId={catalogId} />
    </section>
  );
}
// #endregion keyed-model

// #region usage
export const hardwareFilters = <ProductFilters catalogId="hardware" />;
export const furnitureFilters = <ProductFilters catalogId="furniture" />;
// #endregion usage

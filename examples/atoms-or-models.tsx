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
  static: { title: 'Player hub' },
});
// #endregion global-atoms

// #region factory
export function createFiltersModel() {
  const $term = atom('');
  const $onSaleOnly = atom(false);

  return { $term, $onSaleOnly };
}

export const $$catalogFilters = createFiltersModel();
export const $$wishlistFilters = createFiltersModel();
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

function SaleView({
  onSaleOnly,
  onSaleChange,
}: {
  onSaleOnly: boolean;
  onSaleChange: (checked: boolean) => void;
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={onSaleOnly}
        onChange={(event) => onSaleChange(event.target.checked)}
      />
      On sale only
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

const CatalogSale = holo({
  view: SaleView,
  read: { onSaleOnly: $$catalogFilters.$onSaleOnly },
  write: { onSaleChange: $$catalogFilters.$onSaleOnly },
});

export function CatalogFilters() {
  return (
    <section>
      <CatalogTerm />
      <CatalogSale />
    </section>
  );
}
// #endregion direct-model

// #region keyed-model
const $$filters = pipe(createFiltersModel, modelRegistry());

const GameTerm = holo({
  models: {
    filters: (props: { catalogId: string }) =>
      $$filters({ key: ['catalog', props.catalogId] }),
  },
  view: TermView,
  read: ({ filters }) => ({ term: filters.$term }),
  write: ({ filters }) => ({ onTermChange: filters.$term }),
});

const GameSale = holo({
  models: {
    filters: (props: { catalogId: string }) =>
      $$filters({ key: ['catalog', props.catalogId] }),
  },
  view: SaleView,
  read: ({ filters }) => ({ onSaleOnly: filters.$onSaleOnly }),
  write: ({ filters }) => ({ onSaleChange: filters.$onSaleOnly }),
});

export function GameFilters({ catalogId }: { catalogId: string }) {
  return (
    <section>
      <GameTerm catalogId={catalogId} />
      <GameSale catalogId={catalogId} />
    </section>
  );
}
// #endregion keyed-model

// #region usage
export const featuredFilters = <GameFilters catalogId="featured" />;
export const gamesFilters = <GameFilters catalogId="games" />;
// #endregion usage

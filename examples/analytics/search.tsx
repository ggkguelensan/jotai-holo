import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { modelAnalytics } from 'jotai-holo/analytics';
import { createSearchModel, type Product } from './search-model.js';

// #region analytics-binding
export const $$search = pipe(
  createSearchModel,

  modelRegistry(),

  modelAnalytics(() =>
    import('./search.analytics.js').then(
      (module) => module.createSearchAnalyticsModel,
    ),
  ),
);
// #endregion analytics-binding

function SearchFormView({
  query,
  onTermChange,
  onSearch,
}: {
  initialTerm: string;
  query: string;
  onTermChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <input
        aria-label="Catalog search"
        value={query}
        onChange={(event) => onTermChange(event.target.value)}
      />
      <button type="submit">Search catalog</button>
    </form>
  );
}

export const SearchForm = holo({
  models: { search: $$search },
  view: SearchFormView,
  read: ({ search: $$search }) => ({ query: $$search.$query }),
  write: ({ search: $$search }) => ({
    onTermChange: $$search.termChanged,
    onSearch: $$search.search,
  }),
  input: ({ search: $$search }) => ({ initialTerm: $$search.termChanged }),
});

function ProductListView({
  products,
  onProductOpen,
}: {
  products: readonly Product[];
  onProductOpen: (fact: { productId: string; position: number }) => void;
}) {
  return (
    <ul>
      {products.map((product, position) => (
        <li key={product.id}>
          <button
            onClick={() => onProductOpen({ productId: product.id, position })}
          >
            {product.name} · ${product.price}
          </button>
        </li>
      ))}
    </ul>
  );
}

export const ProductList = holo({
  models: { search: $$search },
  view: ProductListView,
  read: ({ search: $$search }) => ({ products: $$search.$products }),
  write: ({ search: $$search }) => ({ onProductOpen: $$search.openProduct }),
});

function ProductDetailsView({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  if (!product) return null;
  return (
    <article>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={onClose}>Close details</button>
    </article>
  );
}

export const ProductDetails = holo({
  models: { search: $$search },
  view: ProductDetailsView,
  read: ({ search: $$search }) => ({ product: $$search.$selectedProduct }),
  write: ({ search: $$search }) => ({ onClose: $$search.closeProduct }),
});

export function AnalyticsSearch({ initialTerm }: { initialTerm: string }) {
  return (
    <section>
      <h2>Product search and independent analytics</h2>
      <p>Local catalog; recording adapters, no external SDK or requests.</p>
      <SearchForm initialTerm={initialTerm} />
      <ProductList />
      <ProductDetails />
    </section>
  );
}

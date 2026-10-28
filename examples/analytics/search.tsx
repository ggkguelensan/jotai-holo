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

function SearchView({
  query,
  products,
  selectedProduct,
  onTermChange,
  onSearch,
  onProductOpen,
  onProductClose,
}: {
  initialTerm: string;
  query: string;
  products: readonly Product[];
  selectedProduct: Product | null;
  onProductClose: () => void;
  onTermChange: (value: string) => void;
  onSearch: () => void;
  onProductOpen: (fact: { productId: string; position: number }) => void;
}) {
  return (
    <section>
      <h2>Product search and independent analytics</h2>
      <p>Local catalog; recording adapters, no external SDK or requests.</p>
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
      <ul>
        {products.map((product, position) => (
          <li key={product.id}>
            <button
              onClick={() =>
                onProductOpen({
                  productId: product.id,
                  position,
                })
              }
            >
              {product.name} · ${product.price}
            </button>
          </li>
        ))}
      </ul>
      {selectedProduct && (
        <article>
          <h3>{selectedProduct.name}</h3>
          <p>${selectedProduct.price}</p>
          <button onClick={onProductClose}>Close details</button>
        </article>
      )}
    </section>
  );
}

export const AnalyticsSearch = holo({
  models: { search: $$search },
  view: SearchView,

  read: ({ search }) => ({
    query: search.$query,
    products: search.$products,
    selectedProduct: search.$selectedProduct,
  }),

  write: ({ search }) => ({
    onTermChange: search.termChanged,
    onSearch: search.search,
    onProductOpen: search.openProduct,
    onProductClose: search.closeProduct,
  }),

  inputProps: ({ search }) => ({
    initialTerm: search.termChanged,
  }),
});
// #endregion analytics-binding

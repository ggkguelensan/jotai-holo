import { useLingui } from '@lingui/react/macro';
import { holo } from 'jotai-holo';
import { $$search } from '../analytics/search.js';
import type { Product } from '../analytics/search-model.js';

// #region analytics
function SearchAnalyticsView({
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
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Product catalog`}</span>
      <label>
        {t`Search products`}
        <input
          value={query}
          onChange={(event) => onTermChange(event.target.value)}
        />
      </label>
      <button type="button" onClick={onSearch}>
        {t`Search`}
      </button>
      <p className="demo-note">
        {t`Search → Amplitude + warehouse; product open → PostHog.`}
      </p>
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
          <h3>{t`Product details`}</h3>
          <p>
            {selectedProduct.name} · ${selectedProduct.price}
          </p>
          <button onClick={onProductClose}>{t`Close details`}</button>
        </article>
      )}
      <p className="demo-note">
        {t`Recording adapters write to the console; no SDK or network.`}
      </p>
    </div>
  );
}

const SearchAnalytics = holo({
  models: { search: $$search },
  view: SearchAnalyticsView,

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

  staticProps: { initialTerm: 'desk' },
  inputProps: ({ search }) => ({ initialTerm: search.termChanged }),
});
// #endregion analytics

export default SearchAnalytics;

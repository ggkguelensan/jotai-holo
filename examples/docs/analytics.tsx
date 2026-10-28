import { useLingui } from '@lingui/react/macro';
import { holo } from 'jotai-holo';
import {
  $deliveries,
  $$recordedSearch,
  type Delivery,
} from './analytics-recording.js';
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
    <div className="demo-form demo-analytics-catalog">
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
      <ul className="demo-analytics-products">
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
    </div>
  );
}

const SearchAnalytics = holo({
  models: { search: $$recordedSearch },
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

  static: { initialTerm: 'desk' },
  input: ({ search }) => ({ initialTerm: search.termChanged }),
});
// #endregion analytics

function DeliveryConsoleView({
  deliveries,
  onClear,
}: {
  deliveries: readonly Delivery[];
  onClear: (entries: readonly Delivery[]) => void;
}) {
  const { t } = useLingui();
  const summary = t`Actual adapter deliveries · last 50 messages`;

  return (
    <section
      className="demo-analytics-console"
      aria-label={t`Analytics console`}
    >
      <header>
        <strong>{t`Analytics console`}</strong>
        <button disabled={!deliveries.length} onClick={() => onClear([])}>
          {t`Clear logs`}
        </button>
      </header>
      <p className="demo-note">{summary}</p>
      <ol aria-live="polite" aria-relevant="additions">
        {[...deliveries].reverse().map(({ id, engine, name, properties }) => (
          <li key={id}>
            <div>
              <span>{engine}</span>
              <code>#{id}</code>
            </div>
            <strong>{name}</strong>
            <pre>{JSON.stringify(properties, null, 2)}</pre>
          </li>
        ))}
      </ol>
      {!deliveries.length && (
        <p className="demo-analytics-empty">
          {t`Search for a product, then open it to see each engine's payload.`}
        </p>
      )}
      <footer>{t`Demo adapters only · no SDK or network requests`}</footer>
    </section>
  );
}

const DeliveryConsole = holo({
  view: DeliveryConsoleView,
  read: { deliveries: $deliveries },
  write: { onClear: $deliveries },
});

export default function AnalyticsDemo() {
  return (
    <div className="demo-analytics">
      <SearchAnalytics />
      <DeliveryConsole />
    </div>
  );
}

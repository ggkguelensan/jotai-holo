import { useLingui } from '@lingui/react/macro';
import { holo } from 'jotai-holo';
import {
  $deliveries,
  $$recordedSearch as $$search,
  type Delivery,
} from './analytics-recording.js';
import type { Product } from '../analytics/search-model.js';

// #region analytics
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
  const { t } = useLingui();

  return (
    <form
      className="demo-analytics-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <span className="demo-eyebrow">{t`Product catalog`}</span>
      <label>
        {t`Search products`}
        <input
          value={query}
          onChange={(event) => onTermChange(event.target.value)}
        />
      </label>
      <button type="submit">{t`Search`}</button>
    </form>
  );
}

const SearchForm = holo({
  models: { search: $$search },
  view: SearchFormView,

  read: ({ search: $$search }) => ({ query: $$search.$query }),

  write: ({ search: $$search }) => ({
    onTermChange: $$search.termChanged,
    onSearch: $$search.search,
  }),

  static: { initialTerm: 'desk' },
  input: ({ search: $$search }) => ({
    initialTerm: $$search.termChanged,
  }),
});

function ProductListView({
  products,
  onProductOpen,
}: {
  products: readonly Product[];
  onProductOpen: (fact: { productId: string; position: number }) => void;
}) {
  return (
    <ul className="demo-analytics-products">
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

const ProductList = holo({
  models: { search: $$search },
  view: ProductListView,

  read: ({ search: $$search }) => ({ products: $$search.$products }),

  write: ({ search: $$search }) => ({
    onProductOpen: $$search.openProduct,
  }),
});

function ProductDetailsView({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { t } = useLingui();
  if (!product) return null;

  return (
    <article>
      <h3>{t`Product details`}</h3>
      <p>
        {product.name} · ${product.price}
      </p>
      <button onClick={onClose}>{t`Close details`}</button>
    </article>
  );
}

const ProductDetails = holo({
  models: { search: $$search },
  view: ProductDetailsView,

  read: ({ search: $$search }) => ({ product: $$search.$selectedProduct }),

  write: ({ search: $$search }) => ({ onClose: $$search.closeProduct }),
});

function ProductCatalog() {
  return (
    <div className="demo-form demo-analytics-catalog">
      <SearchForm />
      <ProductList />
      <ProductDetails />
    </div>
  );
}
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
      <ProductCatalog />
      <DeliveryConsole />
    </div>
  );
}

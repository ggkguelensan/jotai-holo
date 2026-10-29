import { useLingui } from '@lingui/react/macro';
import { holo, ion } from 'jotai-holo';
import {
  $deliveries,
  $$recordedSearch as $$search,
  type Delivery,
} from './analytics-recording.js';
import type { Product } from '../analytics/search-model.js';

// #region analytics
function SearchTermView({
  query,
  onTermChange,
}: {
  query: string;
  onTermChange: (value: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Search products`}
      <input
        value={query}
        onChange={(event) => onTermChange(event.target.value)}
      />
    </label>
  );
}

const SearchTerm = holo({
  models: { search: $$search },
  view: SearchTermView,
  read: ({ search: $$search }) => ({ query: $$search.$query }),
  write: ({ search: $$search }) => ({ onTermChange: $$search.termChanged }),
});

function SearchFormView({
  onSearch,
}: {
  initialTerm: string;
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
      <SearchTerm />
      <button type="submit">{t`Search`}</button>
    </form>
  );
}

const SearchForm = holo({
  models: { search: $$search },
  view: SearchFormView,

  write: ({ search: $$search }) => ({ onSearch: $$search.search }),
  static: { initialTerm: 'desk' },
  input: ({ search: $$search }) => ({
    initialTerm: $$search.termChanged,
  }),
});

function ProductRowView({
  product,
  position,
  onProductOpen,
}: {
  product: Product;
  position: number;
  onProductOpen: (fact: { productId: string; position: number }) => void;
}) {
  return (
    <li>
      <button
        onClick={() => onProductOpen({ productId: product.id, position })}
      >
        {product.name} · ${product.price}
      </button>
    </li>
  );
}

const ProductRow = holo({
  models: { search: $$search },
  view: ProductRowView,
  write: ({ search: $$search }) => ({ onProductOpen: $$search.openProduct }),
});

function ProductListView({ products }: { products: readonly Product[] }) {
  return (
    <ul className="demo-analytics-products">
      {products.map((product, position) => (
        <ProductRow key={product.id} product={product} position={position} />
      ))}
    </ul>
  );
}

const ProductList = holo({
  models: { search: $$search },
  view: ProductListView,
  read: ({ search: $$search }) => ({ products: $$search.$products }),
});

function CloseProductView({ onClose }: { onClose: () => void }) {
  const { t } = useLingui();

  return <button onClick={onClose}>{t`Close details`}</button>;
}

const CloseProduct = holo({
  models: { search: $$search },
  view: CloseProductView,
  write: ({ search: $$search }) => ({ onClose: $$search.closeProduct }),
});

function ProductDetailsView({ product }: { product: Product | null }) {
  const { t } = useLingui();
  if (!product) return null;

  return (
    <article>
      <h3>{t`Product details`}</h3>
      <p>
        {product.name} · ${product.price}
      </p>
      <CloseProduct />
    </article>
  );
}

const ProductDetails = holo({
  models: { search: $$search },
  view: ProductDetailsView,

  read: ({ search: $$search }) => ({ product: $$search.$selectedProduct }),
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

const $hasDeliveries = ion($deliveries, (deliveries) => deliveries.length > 0);

function ClearLogsView({
  enabled,
  onClear,
}: {
  enabled: boolean;
  onClear: (entries: readonly Delivery[]) => void;
}) {
  const { t } = useLingui();

  return (
    <button disabled={!enabled} onClick={() => onClear([])}>
      {t`Clear logs`}
    </button>
  );
}

const ClearLogs = holo({
  view: ClearLogsView,
  read: { enabled: $hasDeliveries },
  write: { onClear: $deliveries },
});

function DeliveryListView({ deliveries }: { deliveries: readonly Delivery[] }) {
  const { t } = useLingui();

  return (
    <>
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
    </>
  );
}

const DeliveryList = holo({
  view: DeliveryListView,
  read: { deliveries: $deliveries },
});

function DeliveryConsole() {
  const { t } = useLingui();
  const summary = t`Actual adapter deliveries · last 50 messages`;

  return (
    <section
      className="demo-analytics-console"
      aria-label={t`Analytics console`}
    >
      <header>
        <strong>{t`Analytics console`}</strong>
        <ClearLogs />
      </header>
      <p className="demo-note">{summary}</p>
      <DeliveryList />
      <footer>{t`Demo adapters only · no SDK or network requests`}</footer>
    </section>
  );
}

export default function AnalyticsDemo() {
  return (
    <div className="demo-analytics">
      <ProductCatalog />
      <DeliveryConsole />
    </div>
  );
}

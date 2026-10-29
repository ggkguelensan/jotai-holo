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

function SearchTermView({
  query,
  onTermChange,
}: {
  query: string;
  onTermChange: (value: string) => void;
}) {
  return (
    <input
      aria-label="Catalog search"
      value={query}
      onChange={(event) => onTermChange(event.target.value)}
    />
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
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <SearchTerm />
      <button type="submit">Search catalog</button>
    </form>
  );
}

export const SearchForm = holo({
  models: { search: $$search },
  view: SearchFormView,
  write: ({ search: $$search }) => ({ onSearch: $$search.search }),
  input: ({ search: $$search }) => ({ initialTerm: $$search.termChanged }),
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
    <ul>
      {products.map((product, position) => (
        <ProductRow key={product.id} product={product} position={position} />
      ))}
    </ul>
  );
}

export const ProductList = holo({
  models: { search: $$search },
  view: ProductListView,
  read: ({ search: $$search }) => ({ products: $$search.$products }),
});

function CloseProductView({ onClose }: { onClose: () => void }) {
  return <button onClick={onClose}>Close details</button>;
}

const CloseProduct = holo({
  models: { search: $$search },
  view: CloseProductView,
  write: ({ search: $$search }) => ({ onClose: $$search.closeProduct }),
});

function ProductDetailsView({ product }: { product: Product | null }) {
  if (!product) return null;
  return (
    <article>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <CloseProduct />
    </article>
  );
}

export const ProductDetails = holo({
  models: { search: $$search },
  view: ProductDetailsView,
  read: ({ search: $$search }) => ({ product: $$search.$selectedProduct }),
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

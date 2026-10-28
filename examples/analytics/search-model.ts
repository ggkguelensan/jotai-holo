import { actionAtom, eventAtom, stateAtom } from 'jotai-holo/vanilla';

const products = [
  { id: 'oak-desk', name: 'Oak desk', price: 450 },
  { id: 'desk-lamp', name: 'Desk lamp', price: 65 },
  { id: 'task-chair', name: 'Task chair', price: 190 },
];
export type Product = (typeof products)[number];

// #region search-model
export function createSearchModel() {
  const $query = stateAtom('');
  const $category = stateAtom('furniture');
  const $products = stateAtom<readonly Product[]>([]);
  const $selectedProduct = stateAtom<Product | null>(null);

  // #region search-fact
  const searchCompleted = eventAtom<{
    query: string;
    category: string;
    resultCount: number;
    durationMs: number;
  }>();
  // #endregion search-fact

  const productOpened = eventAtom<{
    productId: string;
    position: number;
  }>();

  const termChanged = actionAtom((_get, set, query: string) => {
    set($query, query);
  });

  // #region search-command
  const search = actionAtom((get, set) => {
    const query = get($query).trim();
    const started = performance.now();
    // Local catalog simulation; a real application emits after API success.
    const found = products.filter((product) =>
      product.name.toLowerCase().includes(query.toLowerCase()),
    );
    set($products, found);
    set(searchCompleted, {
      query,
      category: get($category),
      resultCount: found.length,
      durationMs: performance.now() - started,
    });
  });

  // #endregion search-command

  const openProduct = actionAtom(
    (
      get,
      set,
      fact: {
        productId: string;
        position: number;
      },
    ) => {
      const product = products.find((item) => item.id === fact.productId);
      if (!product || get($selectedProduct)?.id === product.id) return;
      set($selectedProduct, product);
      set(productOpened, fact);
    },
  );

  const closeProduct = actionAtom((_get, set) => {
    set($selectedProduct, null);
  });

  return {
    $query,
    $category,
    $products,
    $selectedProduct,
    termChanged,
    search,
    searchCompleted,
    productOpened,
    openProduct,
    closeProduct,
  };
}
export type SearchModel = ReturnType<typeof createSearchModel>;
// #endregion search-model

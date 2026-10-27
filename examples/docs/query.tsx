import { useLingui } from '@lingui/react/macro';
import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
import { QueryClient } from '@tanstack/react-query';
import { holo, holoMatch, stateAtom } from 'jotai-holo';
import { queryAtoms } from 'jotai-holo/query';
import { queryOptions } from '@tanstack/react-query';

// #region query
const $productId = stateAtom('desk');
// Resource factory: consumers keep the options intact
// and never reconstruct its query key.
export const productDetailQO = ({ productId }: { productId: string }) =>
  queryOptions({
    queryKey: ['products', 'detail', { productId }] as const,
    queryFn: async ({ signal }) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 250);
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });
      if (productId !== 'desk' && productId !== 'lamp') return null;
      return {
        id: productId,
        name: productId === 'desk' ? 'Oak desk' : 'Desk lamp',
        price: productId === 'desk' ? 240 : 45,
      };
    },
  });

export const product = queryAtoms({
  state: { productId: $productId },
  query: productDetailQO,
  prism: {
    $product: (result) => result.data,
    $screen: (result): 'loading' | 'error' | 'empty' | 'ready' => {
      if (result.isPending) return 'loading';
      if (result.isError) return 'error';
      if (result.data == null) return 'empty';
      return 'ready';
    },
    $refreshing: (result) => result.isFetching && !result.isPending,
    $error: (result) => result.error,
  },
});

type Product = { id: string; name: string; price: number };

function CardView({ data }: { data: Product | null | undefined }) {
  const { t } = useLingui();
  // A separate screen atom does not narrow this atom's TypeScript type.
  if (!data) return null;
  const name = data.id === 'desk' ? t`Oak desk` : t`Desk lamp`;

  return <p role="status">{`${name} · $${data.price}`}</p>;
}

function LoadingView() {
  const { t } = useLingui();

  return <p role="status">{t`Loading…`}</p>;
}

function EmptyView() {
  const { t } = useLingui();

  return <p role="status">{t`Product not found.`}</p>;
}

function ErrorView({ error }: { error: Error | null }) {
  const { t } = useLingui();

  return <p role="alert">{error?.message ?? t`Could not load. Try again.`}</p>;
}

const Card = holo({
  core: CardView,
  state: { data: product.$product },
});

const ProductError = holo({
  core: ErrorView,
  state: { error: product.$error },
});

const ProductContent = holoMatch({
  source: product.$screen,
  cases: {
    loading: LoadingView,
    error: ProductError,
    empty: EmptyView,
    ready: Card,
  },
});

function CatalogView() {
  const { t } = useLingui();

  return (
    <section>
      <span className="demo-eyebrow">{t`Product catalog`}</span>
      <ProductContent />
    </section>
  );
}

function SwitchView({ onChange }: { onChange: (value: string) => void }) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button onClick={() => onChange('desk')}>{t`Desk`}</button>
      <button onClick={() => onChange('lamp')}>{t`Lamp`}</button>
    </div>
  );
}

const Switch = holo({
  core: SwitchView,
  actions: { onChange: $productId },
});

function CatalogDemo() {
  return (
    <div className="demo-form">
      <CatalogView />
      <Switch />
    </div>
  );
}
// #endregion query

export default CatalogDemo;

// Preview setup: each mounted example injects its own QueryClient.
export function setup(store: ReturnType<typeof createStore>) {
  store.set(
    queryClientAtom,
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    }),
  );
}

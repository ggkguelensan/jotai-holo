import { useLingui } from '@lingui/react/macro';
import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
import { QueryClient } from '@tanstack/react-query';
import { holo, stateAtom } from 'jotai-holo';
import { queryAtoms } from 'jotai-holo/query';
import { queryOptions } from '@tanstack/react-query';

// #region query
const $productId = stateAtom('desk');
// Resource factory: consumers keep the options intact and never reconstruct its query key.
const productDetailQO = ({ productId }: { productId: string }) =>
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
      return {
        name: productId === 'desk' ? 'Oak desk' : 'Desk lamp',
        price: productId === 'desk' ? 240 : 45,
      };
    },
  });

const product = queryAtoms({
  state: { productId: $productId },
  query: productDetailQO,
  prism: {
    $product: (result) => result.data,
    $pending: (result) => result.isPending,
    $refreshing: (result) => result.isFetching && !result.isPending,
    $error: (result) => result.error,
  },
});

function CardView({
  data,
  pending,
  error,
}: {
  data: { name: string; price: number } | undefined;
  pending: boolean;
  error: Error | null;
}) {
  const { t } = useLingui();

  return (
    <section>
      <span className="demo-eyebrow">{t`Product catalog`}</span>
      <p role="status">
        {pending
          ? t`Loading…`
          : error
            ? error.message
            : `${data?.name === 'Oak desk' ? t`Oak desk` : t`Desk lamp`} · $${data?.price}`}
      </p>
    </section>
  );
}

const Card = holo({
  core: CardView,
  state: { data: product.$product, pending: product.$pending, error: product.$error },
});

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
      <Card />
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
    new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }),
  );
}

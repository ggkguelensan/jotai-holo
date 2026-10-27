import type { I18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { createStore, Provider } from 'jotai';
import { lazy, Suspense, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

type DemoModule = {
  default: ComponentType;
  setup?: (store: ReturnType<typeof createStore>) => void;
};

const demos: Record<string, () => Promise<DemoModule>> = {
  counter: () => import('../../../examples/docs/counter'),
  imperative: () => import('../../../examples/docs/imperative'),
  ion: () => import('../../../examples/docs/ion'),
  prism: () => import('../../../examples/docs/prism'),
  event: () => import('../../../examples/docs/event'),
  bond: () => import('../../../examples/docs/bond'),
  lifecycle: () => import('../../../examples/docs/lifecycle'),
  list: () => import('../../../examples/docs/list'),
  match: () => import('../../../examples/docs/match'),
  operators: () => import('../../../examples/docs/operators'),
  model: () => import('../../../examples/docs/model'),
  query: () => import('../../../examples/docs/query'),
  mutation: () => import('../../../examples/docs/mutation'),
  spreadsheet: () => import('../../../examples/docs/spreadsheet'),
  form: () => import('../../../examples/docs/form'),
};

export function mountDemo(host: HTMLElement, kind: string, i18n: I18n) {
  const load = demos[kind];
  if (!load) throw new Error(`Unknown documentation demo: ${kind}`);
  const store = createStore();
  const Demo = lazy(async () => {
    const example = await load();
    example.setup?.(store);
    return example;
  });
  const root = createRoot(host);
  root.render(
    <I18nProvider i18n={i18n}>
      <Provider store={store}>
        <Suspense fallback={<span>…</span>}>
          <Demo />
        </Suspense>
      </Provider>
    </I18nProvider>,
  );
  return root;
}

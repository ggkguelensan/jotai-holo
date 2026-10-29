import type { I18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { createStore, Provider } from 'jotai';
import { lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { GraphActivity } from '../graph/contracts';
import { MotionConfig } from 'motion/react';

type DemoModule = {
  default: ComponentType;
  setup?: (store: ReturnType<typeof createStore>) => void;
};

const demos: Record<string, () => Promise<DemoModule>> = {
  counter: () => import('../../../examples/docs/counter'),
  imperative: () => import('../../../examples/docs/imperative'),
  'imperative-focus': () => import('../../../examples/docs/imperative-focus'),
  'imperative-animation': () => import('../../../examples/docs/imperative-animation'),
  'imperative-purchase': () => import('../../../examples/docs/imperative-purchase'),
  'imperative-share': () => import('../../../examples/docs/imperative-share'),
  ion: () => import('../../../examples/docs/ion'),
  prism: () => import('../../../examples/docs/prism'),
  bond: () => import('../../../examples/docs/bond'),
  input: () => import('../../../examples/docs/input'),
  analytics: () => import('../../../examples/docs/analytics'),
  'data-lifecycle': () => import('../../../examples/docs/data-lifecycle'),
  list: () => import('../../../examples/docs/list'),
  match: () => import('../../../examples/docs/match'),
  operators: () => import('../../../examples/docs/operators'),
  model: () => import('../../../examples/docs/model'),
  query: () => import('../../../examples/docs/query'),
  mutation: () => import('../../../examples/docs/mutation'),
  spreadsheet: () => import('../../../examples/docs/spreadsheet'),
  form: () => import('../../../examples/docs/form'),
};

function DemoMotion({ children }: { children: ReactNode }) {
  const [keyboard, setKeyboard] = useState(false);
  return (
    <div
      style={{ display: 'contents' }}
      data-demo-input={keyboard ? 'keyboard' : 'pointer'}
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.demoInput = 'keyboard';
        setKeyboard(true);
      }}
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.demoInput = 'pointer';
        setKeyboard(false);
      }}
    >
      <MotionConfig
        reducedMotion="user"
        transition={{
          duration: keyboard ? 0 : 0.18,
          ease: [0.23, 1, 0.32, 1],
        }}
      >
        {children}
      </MotionConfig>
    </div>
  );
}

export function mountDemo(
  host: HTMLElement,
  kind: string,
  i18n: I18n,
  onGraphActivity?: (event: GraphActivity) => void,
) {
  const load = demos[kind];
  if (!load) throw new Error(`Unknown documentation demo: ${kind}`);
  const store = createStore();
  let disposed = false;
  let stopGraph: (() => void) | undefined;
  const Demo = lazy(async () => {
    const example = await load();
    if (disposed) return { default: () => null };
    example.setup?.(store);
    if (onGraphActivity && kind === 'analytics') {
      const { observeAnalytics } = await import('../graph/observe-analytics');
      if (!disposed) stopGraph = observeAnalytics(store, onGraphActivity);
    }
    return example;
  });
  const root = createRoot(host);
  root.render(
    <I18nProvider i18n={i18n}>
      <Provider store={store}>
        <Suspense fallback={<span>…</span>}>
          <DemoMotion>
            <Demo />
          </DemoMotion>
        </Suspense>
      </Provider>
    </I18nProvider>,
  );
  return {
    unmount() {
      disposed = true;
      stopGraph?.();
      root.unmount();
    },
  };
}

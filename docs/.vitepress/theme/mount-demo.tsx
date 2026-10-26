import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import type { DocsTranslator } from '../../../examples/docs-i18n.js';
import { createDocumentationDemo } from '../../../examples/docs-demos';
export function mountDemo(host: HTMLElement, kind: string, t: DocsTranslator) {
  const Demo =
    kind === 'bunshi'
      ? lazy(async () => ({
          default: (await import('../../../examples/docs-bunshi')).createBunshiDemo(t),
        }))
      : ['operators', 'model', 'query', 'form'].includes(kind)
        ? lazy(async () => ({
            default: (
              await import('../../../examples/docs-infrastructure')
            ).createInfrastructureDemo(kind, t),
          }))
        : createDocumentationDemo(kind, t);
  const root = createRoot(host);
  root.render(
    <Suspense fallback={<span>…</span>}>
      <Demo />
    </Suspense>,
  );
  return root;
}

import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createDocumentationDemo } from '../../../examples/docs-demos';
export function mountDemo(host: HTMLElement, kind: string, ru: boolean) {
  const Demo =
    kind === 'bunshi'
      ? lazy(async () => ({
          default: (await import('../../../examples/docs-bunshi')).createBunshiDemo(ru),
        }))
      : ['operators', 'model', 'query', 'form'].includes(kind)
        ? lazy(async () => ({
            default: (
              await import('../../../examples/docs-infrastructure')
            ).createInfrastructureDemo(kind, ru),
          }))
        : createDocumentationDemo(kind, ru);
  const root = createRoot(host);
  root.render(
    <Suspense fallback={<span>…</span>}>
      <Demo />
    </Suspense>,
  );
  return root;
}

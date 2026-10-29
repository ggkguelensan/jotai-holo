import { createRoot } from 'react-dom/client';
import { Graph } from './Graph';
import type { GraphScene, GraphUi } from './contracts';
export type GraphProps = {
  scene: GraphScene;
  ui: GraphUi;
  mode: 'mini' | 'map';
  selected: string | null;
  onSelect: (id: string | null) => void;
  activeBranches?: Readonly<Record<string, boolean>>;
  activeNodes?: readonly string[];
};
export function mountGraph(host: HTMLElement, initial: GraphProps) {
  const root = createRoot(host);
  const render = (props: GraphProps) => root.render(<Graph {...props} />);
  render(initial);
  return { render, unmount: () => root.unmount() };
}

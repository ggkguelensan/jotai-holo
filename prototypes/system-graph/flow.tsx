import { Graph, SourcePane } from './graph';
import { flow } from './spec';
import type { VariantProps } from './main';
export function Flow(props: VariantProps) {
  return (
    <section className="graph-card flow-card">
      <header className="card-heading">
        <div>
          <span className="eyebrow">01 / ПОТОК ДАННЫХ</span>
          <h2>От композиции к зависимостям</h2>
        </div>
        <span className="mini-note">Parent → holo → View</span>
      </header>
      <div className="workspace">
        <Graph {...props} layout={flow} />
        <SourcePane selection={props.selected} />
      </div>
    </section>
  );
}

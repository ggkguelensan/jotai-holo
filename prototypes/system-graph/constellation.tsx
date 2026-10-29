import { Graph, SourcePane } from './graph';
import { constellation, groups } from './spec';
import type { VariantProps } from './main';
export function Constellation(props: VariantProps) {
  return (
    <section className="graph-card constellation-card">
      <header className="card-heading">
        <div>
          <span className="eyebrow">02 / КАРТА СВЯЗЕЙ</span>
          <h2>Одна модель. Несколько точек подключения.</h2>
        </div>
        <span className="mini-note">Выбери область, чтобы увидеть её связи</span>
      </header>
      <div className="cluster-tabs" aria-label="Области графа">
        {groups
          .filter((group) => !group.lazy || props.analytics)
          .map((group) => (
            <button
              key={group.id}
              aria-pressed={props.selected.id === group.id}
              onClick={() => props.onSelect(group)}
            >
              <i />
              {group.name}
              <small>{group.tag}</small>
            </button>
          ))}
      </div>
      <div className="workspace orbit-workspace">
        <Graph {...props} layout={constellation} />
        <SourcePane selection={props.selected} />
      </div>
    </section>
  );
}

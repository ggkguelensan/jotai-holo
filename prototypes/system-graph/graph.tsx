import { motion, useReducedMotion, type MotionStyle } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { edges, groups, nodes, sources, type GraphNode, type Group, type Layout } from './spec';

export type Selection = GraphNode | Group;
export const initialSelection = nodes.find((node) => node.id === 'hSummary')!;
const color = { react: '#6aaeff', holo: '#93e9b7', atom: '#eef1f7' };
const resource = new Set(['control', 'amplitude', 'warehouse']);
export function Graph({
  layout,
  selected,
  onSelect,
  analytics,
  activity = [],
  pulse = '',
}: {
  layout: Layout;
  selected: Selection;
  onSelect: (s: Selection) => void;
  analytics: boolean;
  activity?: string[];
  pulse?: string;
}) {
  const reduced = useReducedMotion();
  const prefix = useId().replace(/:/g, '');
  const [labels, setLabels] = useState(false);
  const [pinned, setPinned] = useState(false);
  const selectedIds = new Set(
    'kind' in selected
      ? [selected.id]
      : nodes.filter((n) => n.group === selected.id).map((n) => n.id),
  );
  const neighbors = new Set([...selectedIds]);
  edges.forEach((edge) => {
    if (selectedIds.has(edge.from) || selectedIds.has(edge.to)) {
      neighbors.add(edge.from);
      neighbors.add(edge.to);
    }
  });
  const shown = (id: string) =>
    analytics || !nodes.some((n) => n.id === id && n.group === 'analytics');
  const preview = useRef<Selection>(selected);
  const unpin = () => {
    setPinned(false);
    onSelect(preview.current);
  };
  const pick = (item: Selection, pin = false) => {
    preview.current = item;
    if (!pinned || pin) onSelect(item);
    if (pin) setPinned(true);
  };
  return (
    <div className="graph-shell">
      <div className="canvas-controls">
        <span className="canvas-hint">
          {pinned ? 'Выбор закреплён' : 'Наведи курсор или выбери узел'} · <kbd>Tab</kbd>
        </span>
        <button className="quiet" aria-pressed={labels} onClick={() => setLabels(!labels)}>
          Aa <span>Подписи</span>
        </button>
        {pinned && (
          <button className="quiet" onClick={unpin}>
            Открепить ×
          </button>
        )}
      </div>
      <div
        className="graph-scroll"
        onKeyDown={(event) => {
          if (event.key === 'Escape') unpin();
        }}
      >
        <svg
          className="system-graph"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="group"
          aria-label="Граф покупки подарка. Узлы доступны клавишей Tab."
        >
          <defs>
            <pattern id={`${prefix}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r=".75" fill="#ffffff" opacity=".07" />
            </pattern>
            <marker
              id={`${prefix}-arrow`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M1 1 L7 4 L1 7" fill="none" stroke="context-stroke" strokeWidth="1.4" />
            </marker>
          </defs>
          <rect width={layout.width} height={layout.height} fill={`url(#${prefix}-grid)`} />
          {groups
            .filter((group) => !group.lazy || analytics)
            .map((group) => {
              const [x, y, w, h] = layout.bounds[group.id]!;
              const isActive = selected.id === group.id && !('kind' in selected);
              const dormant = group.lazy && !analytics;
              return (
                <motion.g
                  key={`${group.id}-${dormant}`}
                  initial={group.lazy && !dormant ? { opacity: 0, y: reduced ? 0 : 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.23, ease: [0.23, 1, 0.32, 1] }}
                  className={`model-boundary ${dormant ? 'dormant' : ''} ${isActive ? 'selected' : ''}`}
                >
                  {(group.tag === 'REGISTRY' || group.id === 'form') && (
                    <rect
                      x={x + 5}
                      y={y + 5}
                      width={w}
                      height={h}
                      rx="18"
                      className="registry-copy"
                    />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx="18"
                    tabIndex={0}
                    role="button"
                    aria-label={`${group.name}, ${group.tag}${dormant ? ', не подключена' : ''}`}
                    aria-pressed={isActive}
                    onMouseEnter={() => pick(group)}
                    onFocus={() => pick(group)}
                    onClick={() => pick(group, true)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        pick(group, true);
                      }
                    }}
                  />
                  <text x={x + 16} y={y + 26} className="group-name">
                    {group.name}
                  </text>
                  <text x={x + w - 16} y={y + 45} textAnchor="end" className="group-tag">
                    {group.tag === 'REGISTRY' || group.id === 'form'
                      ? 'KEY · gift / starfall'
                      : dormant
                        ? 'IMPORT НЕ ЗАПУЩЕН'
                        : group.tag}
                  </text>
                  {dormant && (
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + 18}
                      textAnchor="middle"
                      className="dormant-label"
                    >
                      Наблюдение отключено
                    </text>
                  )}
                </motion.g>
              );
            })}
          <g className="graph-edges">
            {edges
              .filter((edge) => shown(edge.from) && shown(edge.to))
              .map((edge, index) => {
                const [x1, y1] = layout.positions[edge.from]!;
                const [x2, y2] = layout.positions[edge.to]!;
                const length = Math.hypot(x2 - x1, y2 - y1);
                const inset = 18;
                const startX = x1 + ((x2 - x1) / length) * inset,
                  startY = y1 + ((y2 - y1) / length) * inset;
                const endX = x2 - ((x2 - x1) / length) * inset,
                  endY = y2 - ((y2 - y1) / length) * inset;
                const reverse = edges.some(
                  (other) => other.from === edge.to && other.to === edge.from,
                );
                const dx = x2 - x1,
                  dy = y2 - y1;
                const d = reverse
                  ? `M${startX},${startY} Q${(x1 + x2) / 2 - (dy / length) * 18},${(y1 + y2) / 2 + (dx / length) * 18} ${endX},${endY}`
                  : layout.curved
                    ? `M${startX},${startY} Q${(x1 + x2) / 2 + 20},${(y1 + y2) / 2 - 30} ${endX},${endY}`
                    : `M${startX},${startY} L${endX},${endY}`;
                const active = selectedIds.has(edge.from) || selectedIds.has(edge.to);
                const running = activity.includes(edge.from) && activity.includes(edge.to);
                return (
                  <path
                    key={index}
                    d={d}
                    className={`edge edge-${edge.type} ${active ? 'edge-active' : ''} ${running ? 'edge-running' : ''}`}
                    markerEnd={`url(#${prefix}-arrow)`}
                  >
                    <title>
                      {edge.from} → {edge.to} · {edge.type}
                    </title>
                  </path>
                );
              })}
          </g>
          {nodes
            .filter((node) => shown(node.id))
            .map((node) => {
              const [x, y] = layout.positions[node.id]!;
              const radius = node.kind === 'react' ? 15 : node.kind === 'holo' ? 12 : 7;
              const selectedNode = selectedIds.has(node.id),
                related = neighbors.has(node.id);
              return (
                <motion.g
                  key={node.id}
                  initial={node.group === 'analytics' ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.23 }}
                  transform={`translate(${x} ${y})`}
                  className={`node node-${node.kind} ${selectedNode ? 'node-selected' : ''} ${related ? 'node-related' : ''}`}
                  style={{ '--node-color': color[node.kind] } as MotionStyle}
                  role="button"
                  tabIndex={0}
                  aria-label={node.label}
                  aria-pressed={selectedNode}
                  onMouseEnter={() => pick(node)}
                  onFocus={() => pick(node)}
                  onClick={() => pick(node, true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      pick(node, true);
                    }
                  }}
                >
                  <circle r={layout.width > 1100 ? 38 : 33} className="node-hit" />
                  <circle r={radius + 6} className="node-ring" />
                  {activity.includes(node.id) && (
                    <motion.circle
                      key={pulse}
                      r={radius + 10}
                      fill="none"
                      stroke={color[node.kind]}
                      strokeWidth="1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: reduced ? 0 : [0, 0.7, 0] }}
                      transition={{ duration: 0.28 }}
                    />
                  )}
                  <circle
                    r={radius}
                    className={`node-dot ${resource.has(node.id) ? 'resource-dot' : ''}`}
                  />
                  {(labels || selectedNode || node.id === 'parent') && (
                    <text y={radius + 22} textAnchor="middle" className="node-label">
                      {node.id === 'parent' ? 'Parent · Checkout' : node.label}
                    </text>
                  )}
                </motion.g>
              );
            })}
        </svg>
      </div>
      <div className="canvas-footer">
        <span>
          <i className="line-key" />
          данные / props
        </span>
        <span>
          <i className="line-key dashed" />
          команда / факт
        </span>
        <span className="scroll-hint">↔ На узком экране граф прокручивается</span>
      </div>
    </div>
  );
}
export function SourcePane({ selection }: { selection: Selection }) {
  const lines = sources[selection.file].split('\n');
  const anchor = Math.max(
    0,
    lines.findIndex((line) => line.includes(selection.anchor)),
  );
  const start = Math.max(0, anchor - 2);
  const end = Math.min(lines.length, start + 16);
  return (
    <aside className="inspector" aria-label="Узел и связанный исходник">
      <div className="selection-detail">
        <span className="eyebrow">
          {'kind' in selection
            ? { react: 'REACT', holo: 'HOLO', atom: 'РЕАКТИВНЫЙ ГРАФ' }[selection.kind]
            : selection.tag}
        </span>
        <h2>{'label' in selection ? selection.label : selection.name}</h2>
        <p>{selection.description}</p>
      </div>
      <div className="source-head">
        <span>
          <i />
          {selection.file}
        </span>
        <span>L{anchor + 1}</span>
      </div>
      <div className="code-scroll">
        <pre>
          <code>
            {lines.slice(start, end).map((line, index) => (
              <span
                key={start + index}
                className={`code-line ${start + index === anchor ? 'code-selected' : ''}`}
              >
                <span className="line-number">{start + index + 1}</span>
                <span>{highlight(line)}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
      <footer className="source-foot">
        Фрагмент исполняемого исходника · наведение меняет выделение
      </footer>
    </aside>
  );
}
function highlight(line: string) {
  return line
    .split(
      /(\/\/.*$|'[^']*'|"[^"]*"|\b(?:const|return|function|export|async|await|if|set|read|write|models|view|trigger|map|properties)\b|\$\$?\w+)/g,
    )
    .map((part, index) => (
      <span
        key={index}
        className={
          part.startsWith('//')
            ? 'syntax-comment'
            : part.startsWith("'") || part.startsWith('"')
              ? 'syntax-string'
              : part.startsWith('$')
                ? 'syntax-atom'
                : /^(const|return|function|export|async|await|if)$/.test(part)
                  ? 'syntax-keyword'
                  : ''
        }
      >
        {part}
      </span>
    ));
}
export function Legend() {
  return (
    <div className="legend">
      <span>
        <i className="dot react" />
        React
      </span>
      <span>
        <i className="dot holo" />
        holo
      </span>
      <span>
        <i className="dot atom" />
        Jotai
      </span>
      <span>
        <i className="dot resource" />
        control / адаптер
      </span>
      <span>
        <i className="boundary-key" />
        модель
      </span>
      <span>
        <i className="boundary-key registry" />
        registry
      </span>
    </div>
  );
}

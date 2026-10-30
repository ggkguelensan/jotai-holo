import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { stepLayout, type Particle } from './force-layout';
import type { GraphScene, GraphUi } from './contracts';
const colors = {
  react: 'var(--graph-react)',
  holo: 'var(--graph-holo)',
  atom: 'var(--graph-atom)',
  resource: 'var(--graph-atom)',
};
export function Graph({
  scene,
  selected,
  onSelect,
  mode = 'mini',
  ui,
  activeBranches = {},
  activeNodes = [],
}: {
  mode?: 'mini' | 'map';
  scene: GraphScene;
  ui: GraphUi;
  activeBranches?: Readonly<Record<string, boolean>>;
  activeNodes?: readonly string[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const reduced = useReducedMotion();
  const data = scene;
  const marker = useId().replace(/:/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const simulation = useRef<Particle[]>([]);
  const wake = useRef<() => void>(() => {});
  const drag = useRef<{ id: string; pointer: number; moved: boolean; x: number; y: number } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const [positions, setPositions] = useState<Particle[]>([]);
  const [settled, setSettled] = useState(false);
  const [pinned, setPinned] = useState(false);
  const width = 300,
    height = 320;
  useEffect(() => {
    if (mode === 'map') {
      simulation.current = [];
      setPositions(
        data.nodes.map((node) => ({
          id: node.id,
          x: node.position[0],
          y: node.position[1],
          vx: 0,
          vy: 0,
        })),
      );
      setSettled(true);
      return;
    }
    const particles: Particle[] = data.nodes.map((node, index) => {
      const angle = (index / data.nodes.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: node.id,
        x: 150 + Math.cos(angle) * 87,
        y: 160 + Math.sin(angle) * 105,
        vx: 0,
        vy: 0,
      };
    });
    simulation.current = particles;
    let frame = 0,
      tick = 0,
      last = 0,
      visible = false,
      disposed = false;
    const paint = () => setPositions(particles.map((node) => ({ ...node })));
    const run = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = last ? Math.max(0.5, Math.min(2, (time - last) / 16.667)) : 1;
      last = time;
      const energy = stepLayout(particles, data.edges, width, height, dt);
      paint();
      tick++;
      if (drag.current || ((tick < 80 || energy > 0.003) && tick < 650))
        frame = requestAnimationFrame(run);
      else setSettled(true);
    };
    const start = () => {
      if (disposed || frame || !visible || document.hidden) return;
      if (reduced) {
        for (let i = 0; i < 400; i++) stepLayout(particles, data.edges, width, height);
        paint();
        setSettled(true);
        return;
      }
      tick = 0;
      last = 0;
      setSettled(false);
      frame = requestAnimationFrame(run);
    };
    wake.current = start;
    paint();
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) start();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(svg.current!);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else start();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
      wake.current = () => {};
    };
  }, [data, reduced, mode]);
  const point = (event: React.PointerEvent) => {
    const matrix = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return {
      x: Math.max(28, Math.min(width - 28, p.x)),
      y: Math.max(28, Math.min(height - 28, p.y)),
    };
  };
  const finish = (event: React.PointerEvent) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const node = simulation.current.find((node) => node.id === current.id)!;
    delete node.fx;
    delete node.fy;
    drag.current = null;
    suppressClick.current = current.moved;
    if (!current.moved && event.type !== 'pointercancel') {
      setPinned(true);
      onSelect(current.id);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    wake.current();
  };
  const visible = (branch?: string) =>
    mode === 'mini' || !branch || activeBranches[branch] !== false;
  const shownNodes = data.nodes.filter((node) => visible(node.branch));
  const shownIds = new Set(shownNodes.map((node) => node.id));
  const map = new Map(positions.map((node) => [node.id, node]));
  const selectedIds = new Set(
    data.groups.some((group) => group.id === selected)
      ? data.nodes.filter((node) => node.group === selected).map((node) => node.id)
      : selected
        ? [selected]
        : [],
  );
  const neighbor = new Set(selectedIds);
  data.edges.forEach((edge) => {
    if (selectedIds.has(edge.from) || selectedIds.has(edge.to)) {
      neighbor.add(edge.from);
      neighbor.add(edge.to);
    }
  });
  return (
    <div className={`docs-graph docs-graph-${mode}`} data-settled={settled}>
      <svg
        ref={svg}
        viewBox={mode === 'map' ? '0 0 1000 650' : `0 0 ${width} ${height}`}
        role="group"
        aria-label={ui.title}
        onClick={(event) => {
          if ((event.target as Element).closest('.mini-node, .docs-graph-group')) return;
          setPinned(false);
          onSelect(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setPinned(false);
            onSelect(null);
          }
        }}
      >
        <defs>
          <marker
            id={marker}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M1 1 L7 4 L1 7" fill="none" stroke="currentColor" />
          </marker>
        </defs>
        {mode === 'map' &&
          data.groups
            .filter((group) => visible(group.branch))
            .map((group) => {
              const [x, y, w, h] = group.bounds;
              return (
                <g
                  key={group.id}
                  className={`docs-graph-group ${group.kind === 'resource' ? 'graph-resource-group' : ''} ${selected === group.id ? 'graph-group-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={group.label}
                  aria-pressed={selected === group.id}
                  onFocus={() => {
                    if (!pinned) onSelect(group.id);
                  }}
                  onMouseEnter={() => {
                    if (!pinned) onSelect(group.id);
                  }}
                  onClick={() => {
                    setPinned(true);
                    onSelect(group.id);
                  }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    setPinned(true);
                    onSelect(group.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setPinned(true);
                      onSelect(group.id);
                    }
                  }}
                >
                  {group.registry && (
                    <rect
                      x={x + 5}
                      y={y + 5}
                      width={w}
                      height={h}
                      rx="17"
                      className="docs-graph-registry"
                    />
                  )}
                  <rect x={x} y={y} width={w} height={h} rx="17" />
                  <text x={x + 16} y={y + 30}>
                    {group.label}
                  </text>
                </g>
              );
            })}
        {data.edges
          .filter((edge) => shownIds.has(edge.from) && shownIds.has(edge.to))
          .map((edge, index) => {
            const a = map.get(edge.from),
              b = map.get(edge.to);
            if (!a || !b) return null;
            const active = selected && (selectedIds.has(edge.from) || selectedIds.has(edge.to));
            if (mode === 'map') {
              const dx = b.x - a.x,
                dy = b.y - a.y,
                len = Math.max(1, Math.hypot(dx, dy));
              const reverse = data.edges.some(
                (other) => other.from === edge.to && other.to === edge.from,
              );
              const x1 = a.x + (dx / len) * 23,
                y1 = a.y + (dy / len) * 23,
                x2 = b.x - (dx / len) * 23,
                y2 = b.y - (dy / len) * 23;
              const d = reverse
                ? `M${x1},${y1} Q${(a.x + b.x) / 2 - (dy / len) * 35},${(a.y + b.y) / 2 + (dx / len) * 35} ${x2},${y2}`
                : `M${x1},${y1} L${x2},${y2}`;
              return (
                <path
                  key={index}
                  d={d}
                  className={`mini-edge graph-edge-${edge.kind} ${active ? 'mini-edge-active' : ''}`}
                  markerEnd={`url(#${marker})`}
                />
              );
            }
            if (
              data.edges
                .slice(0, index)
                .some((other) => other.from === edge.to && other.to === edge.from)
            )
              return null;
            return (
              <line
                key={index}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`mini-edge ${active ? 'mini-edge-active' : ''}`}
              />
            );
          })}
        {shownNodes.map((node) => {
          const p = map.get(node.id);
          if (!p) return null;
          const r =
            mode === 'map'
              ? node.kind === 'react'
                ? 16
                : node.kind === 'holo'
                  ? 12
                  : 8
              : node.kind === 'react'
                ? 7
                : node.kind === 'holo'
                  ? 5.5
                  : 3.5;
          return (
            <g
              key={node.id}
              className={`mini-node ${activeNodes.includes(node.id) ? 'graph-active' : ''} ${node.kind === 'resource' ? 'graph-resource' : ''} ${selected === node.id ? 'mini-selected' : ''} ${selected && !neighbor.has(node.id) ? 'mini-muted' : ''}`}
              transform={`translate(${p.x} ${p.y})`}
              style={{ '--mini-color': colors[node.kind] } as React.CSSProperties}
              role="button"
              tabIndex={0}
              aria-label={node.label}
              aria-pressed={selected === node.id}
              onFocus={() => {
                if (!pinned) onSelect(node.id);
              }}
              onMouseEnter={() => {
                if (mode === 'map' && !pinned) onSelect(node.id);
              }}
              onMouseLeave={() => {
                if (!pinned && !drag.current) onSelect(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setPinned(true);
                  onSelect(node.id);
                }
              }}
              onClick={(event) => {
                if (event.detail > 0 && suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setPinned(true);
                onSelect(node.id);
              }}
              onPointerDown={(event) => {
                if (mode === 'map') {
                  if (event.button !== 0) return;
                  setPinned(true);
                  onSelect(node.id);
                  return;
                }
                if (drag.current || event.button !== 0) return;
                suppressClick.current = false;
                event.currentTarget.setPointerCapture(event.pointerId);
                const pos = point(event);
                drag.current = {
                  id: node.id,
                  pointer: event.pointerId,
                  moved: false,
                  x: event.clientX,
                  y: event.clientY,
                };
                const particle = simulation.current.find((item) => item.id === node.id)!;
                particle.fx = pos.x;
                particle.fy = pos.y;
                onSelect(node.id);
                wake.current();
              }}
              onPointerMove={(event) => {
                const current = drag.current;
                if (!current || current.id !== node.id || current.pointer !== event.pointerId)
                  return;
                current.moved ||=
                  Math.hypot(event.clientX - current.x, event.clientY - current.y) > 4;
                const pos = point(event);
                const particle = simulation.current.find((item) => item.id === node.id)!;
                particle.fx = pos.x;
                particle.fy = pos.y;
                if (reduced) {
                  particle.x = pos.x;
                  particle.y = pos.y;
                  setPositions(simulation.current.map((item) => ({ ...item })));
                }
              }}
              onPointerUp={finish}
              onPointerCancel={finish}
            >
              <circle r={mode === 'map' ? 34 : 26} className="mini-hit" />
              <circle r={r + 5} className="mini-ring" />
              <circle r={r} className="mini-dot" />
              {mode === 'map' && selected === node.id && (
                <text className="mini-node-label" y={r + 15} textAnchor="middle">
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mini-caption" aria-live="polite">
        {selected
          ? (
              data.nodes.find((node) => node.id === selected) ??
              data.groups.find((group) => group.id === selected)
            )?.label
          : ui.hint}
      </div>
    </div>
  );
}

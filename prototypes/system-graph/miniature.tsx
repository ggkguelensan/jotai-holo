import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { stepLayout, type Particle, type Spring } from './force-layout';
import type { Kind } from './spec';

export type MiniNode = { id: string; kind: Kind; label: string; anchor: string };
export type MiniData = { nodes: MiniNode[]; edges: Spring[] };
const colors = { react: '#6aaeff', holo: '#93e9b7', atom: '#eef1f7' };
export function Miniature({
  data,
  selected,
  onSelect,
  mode = 'mini',
}: {
  mode?: 'mini' | 'map';
  data: MiniData;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const reduced = useReducedMotion();
  const svg = useRef<SVGSVGElement>(null);
  const simulation = useRef<Particle[]>([]);
  const wake = useRef<() => void>(() => {});
  const drag = useRef<{ id: string; pointer: number; moved: boolean; x: number; y: number } | null>(
    null,
  );
  const [positions, setPositions] = useState<Particle[]>([]);
  const [settled, setSettled] = useState(false);
  const [pinned, setPinned] = useState(false);
  const preview = useRef<string | null>(null);
  const width = 300,
    height = 320;
  useEffect(() => {
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
  }, [data, reduced]);
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
    if (!current.moved && event.type !== 'pointercancel') {
      setPinned(true);
      onSelect(current.id);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    wake.current();
  };
  const map = new Map(positions.map((node) => [node.id, node]));
  const neighbor = new Set(selected ? [selected] : []);
  data.edges.forEach((edge) => {
    if (edge.from === selected || edge.to === selected) {
      neighbor.add(edge.from);
      neighbor.add(edge.to);
    }
  });
  return (
    <div className={`miniature miniature-${mode}`} data-settled={settled}>
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label="Миниатюра реактивного графа. Узлы можно перетаскивать."
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setPinned(false);
            onSelect(preview.current);
          }
        }}
      >
        {data.edges.map((edge, index) => {
          const a = map.get(edge.from),
            b = map.get(edge.to);
          if (!a || !b) return null;
          return (
            <line
              key={index}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={
                selected && (edge.from === selected || edge.to === selected)
                  ? 'mini-edge mini-edge-active'
                  : 'mini-edge'
              }
            />
          );
        })}
        {data.nodes.map((node) => {
          const p = map.get(node.id);
          if (!p) return null;
          const r = node.kind === 'react' ? 7 : node.kind === 'holo' ? 5.5 : 3.5;
          return (
            <g
              key={node.id}
              className={`mini-node ${selected === node.id ? 'mini-selected' : ''} ${selected && !neighbor.has(node.id) ? 'mini-muted' : ''}`}
              transform={`translate(${p.x} ${p.y})`}
              style={{ '--mini-color': colors[node.kind] } as React.CSSProperties}
              role="button"
              tabIndex={0}
              aria-label={node.label}
              aria-pressed={selected === node.id}
              onFocus={() => {
                preview.current = node.id;
                if (!pinned) onSelect(node.id);
              }}
              onMouseEnter={() => {
                preview.current = node.id;
                if (!pinned) onSelect(node.id);
              }}
              onMouseLeave={() => {
                preview.current = null;
                if (!pinned && !drag.current) onSelect(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setPinned(true);
                  onSelect(node.id);
                }
              }}
              onPointerDown={(event) => {
                if (drag.current || event.button !== 0) return;
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
              <circle r="26" className="mini-hit" />
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
          ? data.nodes.find((node) => node.id === selected)?.label
          : 'Наведи на узел или перетащи его'}
        {pinned && (
          <button
            onClick={() => {
              setPinned(false);
              onSelect(null);
            }}
          >
            Снять выбор ×
          </button>
        )}
      </div>
    </div>
  );
}

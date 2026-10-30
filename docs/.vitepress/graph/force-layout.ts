/** Small deterministic force solver shared by compact graph scenes. */
export type Particle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
};
export type Spring = { from: string; to: string };
export function stepLayout(
  nodes: Particle[],
  links: readonly Spring[],
  width: number,
  height: number,
  dt = 1,
) {
  // Keep larger systems inside the miniature instead of pressing them into its frame.
  const density = Math.min(1, 10 / Math.max(1, nodes.length));
  const forces = nodes.map(() => ({ x: 0, y: 0 }));
  const byId = new Map(nodes.map((node, index) => [node.id, index]));
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]!;
      let dx = a.x - b.x,
        dy = a.y - b.y;
      if (Math.abs(dx) + Math.abs(dy) < 0.01) {
        dx = (i + 1) * 0.1;
        dy = 0.1;
      }
      const distance = Math.max(12, Math.hypot(dx, dy));
      const push = Math.min(2.5, (2500 * density * density) / (distance * distance));
      forces[i]!.x += (dx / distance) * push;
      forces[i]!.y += (dy / distance) * push;
      forces[j]!.x -= (dx / distance) * push;
      forces[j]!.y -= (dy / distance) * push;
    }
    forces[i]!.x += (width / 2 - a.x) * (0.0014 / Math.sqrt(density));
    forces[i]!.y += (height / 2 - a.y) * (0.0014 / Math.sqrt(density));
  }
  for (const link of links) {
    const i = byId.get(link.from),
      j = byId.get(link.to);
    if (i === undefined || j === undefined) continue;
    const a = nodes[i]!,
      b = nodes[j]!;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const pull = (distance - 64 * Math.sqrt(density)) * 0.012;
    forces[i]!.x += (dx / distance) * pull;
    forces[i]!.y += (dy / distance) * pull;
    forces[j]!.x -= (dx / distance) * pull;
    forces[j]!.y -= (dy / distance) * pull;
  }
  let energy = 0;
  nodes.forEach((node, index) => {
    if (node.fx !== undefined && node.fy !== undefined) {
      node.x = node.fx;
      node.y = node.fy;
      node.vx = 0;
      node.vy = 0;
      return;
    }
    const force = forces[index]!;
    const damping = Math.pow(0.82, dt);
    node.vx = Math.max(-4, Math.min(4, (node.vx + force.x * dt) * damping));
    node.vy = Math.max(-4, Math.min(4, (node.vy + force.y * dt) * damping));
    node.x = Math.max(28, Math.min(width - 28, node.x + node.vx * dt));
    node.y = Math.max(28, Math.min(height - 28, node.y + node.vy * dt));
    energy += node.vx * node.vx + node.vy * node.vy;
  });
  return energy;
}

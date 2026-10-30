/** Validate without reading value atoms: Jotai must never see a cyclic read. */
export function validateTopology(
  roots: Iterable<string>,
  read: (address: string) => readonly string[],
): Map<string, string> {
  const errors = new Map<string, string>();
  const depths = new Map<string, number>();
  const active = new Map<string, number>();
  type Frame = {
    address: string;
    refs: readonly string[];
    next: number;
    depth: number;
  };
  const stack: Frame[] = [];
  const enter = (address: string) => {
    active.set(address, stack.length);
    stack.push({ address, refs: read(address), next: 0, depth: 1 });
  };
  for (const root of roots) {
    if (depths.has(root)) continue;
    enter(root);
    while (stack.length) {
      const frame = stack[stack.length - 1]!;
      const ref = frame.refs[frame.next];
      if (ref !== undefined) {
        const cycleStart = active.get(ref);
        if (cycleStart !== undefined) {
          for (let i = cycleStart; i < stack.length; i++)
            errors.set(stack[i]!.address, '#CYCLE!');
        } else if (!depths.has(ref)) {
          enter(ref);
          continue;
        }
        frame.next++;
        frame.depth = Math.max(frame.depth, 1 + (depths.get(ref) ?? 0));
        if (!errors.has(frame.address) && errors.has(ref))
          errors.set(frame.address, errors.get(ref)!);
      } else {
        if (!errors.has(frame.address) && frame.depth > 128)
          errors.set(frame.address, '#LIMIT!');
        depths.set(frame.address, frame.depth);
        active.delete(frame.address);
        stack.pop();
      }
    }
  }
  return errors;
}

import { atom, type Atom, type Getter } from 'jotai/vanilla';

export const actionSource = Symbol('holo.action');
export type ActionSource<Args extends readonly unknown[]> = {
  readonly [actionSource]: Atom<Set<(args: Args) => void>>;
};
export function createActionChannel<Args extends readonly unknown[]>() {
  // A derived zero-dependency atom constructs its Set separately in each store.
  return atom(() => new Set<(args: Args) => void>());
}
export function isActionSource(value: unknown): value is ActionSource<readonly unknown[]> {
  return typeof value === 'object' && value !== null && actionSource in value;
}

type Task = { run: () => void; onError: (error: unknown) => void };
// Shared by every channel in a store, without retaining the store globally.
const $dispatch = atom(() => ({ tasks: [] as Task[], depth: 0, flushing: false }));

export function emitAction<Args extends readonly unknown[]>(
  get: Getter,
  channel: Atom<Set<(args: Args) => void>>,
  args: Args,
) {
  const listeners = get(channel);
  if (!listeners.size) return;
  const queue = get($dispatch);
  queue.depth++;
  try {
    for (const listener of [...listeners]) listener(args);
  } finally {
    queue.depth--;
    flush(queue);
  }
}
export function enqueueAction(get: Getter, run: () => void, onError: (error: unknown) => void) {
  const queue = get($dispatch);
  queue.tasks.push({ run, onError });
  flush(queue);
}
function flush(queue: { tasks: Task[]; depth: number; flushing: boolean }) {
  if (queue.depth || queue.flushing) return;
  queue.flushing = true;
  try {
    let processed = 0;
    while (queue.tasks.length) {
      const task = queue.tasks.shift()!;
      if (++processed > 10000) {
        task.onError(new Error('bond: synchronous event cycle exceeded 10000 steps.'));
        break;
      }
      task.run();
    }
  } finally {
    queue.tasks.length = 0;
    queue.flushing = false;
  }
}

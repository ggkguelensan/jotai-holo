import { atom, type Atom, type Getter } from 'jotai/vanilla';
import type { ActionChannel } from './action-source.js';

type Task = { run: () => void; onError: (error: unknown) => void };
const $dispatch = atom(() => ({ tasks: [] as Task[], depth: 0, flushing: false }));
const listenersKey = Symbol('holo.listeners');
type ObservedChannel<Args extends readonly unknown[]> = ActionChannel<Args> & {
  [listenersKey]?: Set<(args: Args) => void>;
};

/** Consumers install delivery; publishing atoms import no queue or listener runtime. */
export function subscribeAction<Args extends readonly unknown[]>(
  get: Getter,
  channel: Atom<ActionChannel<Args>>,
  listener: (args: Args) => void,
) {
  const record = get(channel) as ObservedChannel<Args>;
  let listeners = record[listenersKey];
  if (!listeners) {
    listeners = new Set();
    record[listenersKey] = listeners;
    const current = listeners;
    const queue = get($dispatch);
    record.emit = (args) => {
      queue.depth++;
      try {
        for (const next of [...current]) next(args);
      } finally {
        queue.depth--;
        flush(queue);
      }
    };
  }
  listeners.add(listener);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    listeners.delete(listener);
    if (!listeners.size && record[listenersKey] === listeners) {
      delete record[listenersKey];
      delete record.emit;
    }
  };
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
        task.onError(new Error('jotai-holo: synchronous event cycle exceeded 10000 steps.'));
        break;
      }
      task.run();
    }
  } finally {
    queue.tasks.length = 0;
    queue.flushing = false;
  }
}

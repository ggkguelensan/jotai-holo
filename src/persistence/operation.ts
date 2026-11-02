/** A deadline ends waiting; settled tracks the actual underlying work. */
export interface Operation<Value> {
  readonly signal: AbortSignal;
  readonly outcome: Promise<Value>;
  readonly settled: Promise<void>;
}

export function deferred<Value>() {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export function startOperation<Value>(
  work: (signal: AbortSignal) => Value | Promise<Value>,
  timeout: number,
  parent?: AbortSignal,
): Operation<Value> {
  const controller = new AbortController();
  const cancelled = deferred<never>();
  const cancel = (reason: unknown) => {
    if (controller.signal.aborted) return;
    controller.abort(reason);
    cancelled.reject(reason);
  };
  const onParentAbort = () => cancel(parent?.reason);
  parent?.addEventListener('abort', onParentAbort, { once: true });
  if (parent?.aborted) onParentAbort();

  const timer = setTimeout(() => cancel(new Error('Persistence operation timed out.')), timeout);
  const actual = Promise.resolve()
    .then(() => {
      controller.signal.throwIfAborted();
      return work(controller.signal);
    })
    .catch((error: unknown) => {
      // undefined is reserved for "no error" in the public status atom.
      throw error === undefined
        ? new Error('Persistence operation failed without a reason.')
        : error;
    });
  const outcome = Promise.race([actual, cancelled.promise]).finally(() => {
    clearTimeout(timer);
    parent?.removeEventListener('abort', onParentAbort);
  });
  const settled = actual.then(
    () => {},
    () => {},
  );
  return { signal: controller.signal, outcome, settled };
}

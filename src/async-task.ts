export async function bounded<T>(
  operation: (signal: AbortSignal) => T | Promise<T>,
  timeout: number,
  parent: AbortSignal,
  late?: (value: T) => void,
): Promise<T> {
  const controller = new AbortController();
  let expired = false;
  let reject: (error: unknown) => void = () => {};
  const abort = () => {
    expired = true;
    controller.abort(parent.reason);
    reject(controller.signal.reason);
  };
  const stopped = new Promise<never>((_, fail) => {
    reject = fail;
  });
  parent.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => {
    expired = true;
    controller.abort(new Error('Analytics operation timed out.'));
    reject(controller.signal.reason);
  }, timeout);
  try {
    if (parent.aborted) {
      abort();
      return await stopped;
    }
    const result = Promise.resolve().then(() => {
      if (controller.signal.aborted) throw controller.signal.reason;
      return operation(controller.signal);
    });
    void result.then(
      (value) => {
        if (expired) late?.(value);
      },
      () => {},
    );
    return await Promise.race([result, stopped]);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener('abort', abort);
  }
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

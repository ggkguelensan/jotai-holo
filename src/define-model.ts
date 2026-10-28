/** Name a synchronous model factory without changing its identity or signature. */
export function defineModel<Factory extends (...args: never[]) => object & { then?: never }>(
  factory: Factory,
): Factory {
  return factory;
}

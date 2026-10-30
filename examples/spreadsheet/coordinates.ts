export type Dimensions = { rows: number; columns: number };
export type Point = { row: number; column: number };
export const limits = { rows: 1000, columns: 1000 };

export function columnName(index: number): string {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  return label;
}

export function point(address: string): Point {
  const match = /^([A-Z]+)([1-9]\d*)$/.exec(address);
  if (!match) throw new RangeError(`Invalid address: ${address}`);
  let column = 0;
  for (const char of match[1]!) column = column * 26 + char.charCodeAt(0) - 64;
  const row = Number(match[2]) - 1;
  if (
    !Number.isSafeInteger(row) ||
    column > limits.columns ||
    row >= limits.rows
  )
    throw new RangeError(`Invalid address: ${address}`);
  return { column: column - 1, row };
}

export const addressOf = ({ column, row }: Point) =>
  `${columnName(column)}${row + 1}`;
export const contains = (size: Dimensions, p: Point) =>
  p.column >= 0 && p.column < size.columns && p.row >= 0 && p.row < size.rows;
export const clampPoint = (p: Point, size: Dimensions): Point => ({
  row: Math.max(0, Math.min(size.rows - 1, p.row)),
  column: Math.max(0, Math.min(size.columns - 1, p.column)),
});
export function validateDimensions(size: Dimensions) {
  for (const key of ['rows', 'columns'] as const)
    if (
      !Number.isInteger(size[key]) ||
      size[key] < 1 ||
      size[key] > limits[key]
    )
      throw new RangeError(`Invalid ${key}: ${size[key]}`);
}
export function reveal(
  camera: Point,
  target: Point,
  window: Dimensions,
  size: Dimensions,
): Point {
  const axis = (
    start: number,
    selected: number,
    visible: number,
    total: number,
  ) =>
    Math.max(
      0,
      Math.min(
        total - visible,
        selected < start
          ? selected
          : selected >= start + visible
            ? selected - visible + 1
            : start,
      ),
    );
  return {
    column: axis(camera.column, target.column, window.columns, size.columns),
    row: axis(camera.row, target.row, window.rows, size.rows),
  };
}

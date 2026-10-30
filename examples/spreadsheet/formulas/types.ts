export type CellValue = number | string;

export type Node =
  | { kind: 'literal'; value: CellValue }
  | { kind: 'ref'; address: string }
  | { kind: 'range'; from: string; to: string }
  | { kind: 'negative'; value: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'sum'; values: Node[] };
